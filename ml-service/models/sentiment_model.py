import os
import joblib
import numpy as np
from collections import Counter
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'sentiment_model.pkl')
NEUTRAL_HINT_REGEX = re.compile(
    r'\b(ok|okay|fine|average|decent|alright|so\s*so|not\s*bad|nothing\s*special|just\s*okay|just\s*fine)\b',
    re.IGNORECASE
)


def _default_reviews():
    return [
        {'reviewText': 'Amazing taste and excellent quality', 'sentimentLabel': 'positive'},
        {'reviewText': 'It was okay and average overall', 'sentimentLabel': 'neutral'},
        {'reviewText': 'Very bad taste and poor service', 'sentimentLabel': 'negative'},
        {'reviewText': 'Loved this dish and would order again', 'sentimentLabel': 'positive'},
        {'reviewText': 'Not great not terrible just fine', 'sentimentLabel': 'neutral'},
        {'reviewText': 'Terrible food and disappointing experience', 'sentimentLabel': 'negative'}
    ]


def _ensure_label_coverage(texts, labels):
    required_labels = {'positive', 'neutral', 'negative'}
    present_labels = set(labels)

    if required_labels.issubset(present_labels):
        return texts, labels

    for row in _default_reviews():
        label = row['sentimentLabel']
        if label not in present_labels:
            texts.append(row['reviewText'].lower())
            labels.append(label)
            present_labels.add(label)

    return texts, labels


def train_sentiment_model(reviews, model_path=MODEL_PATH):

    print('[Sentiment] Starting training using LogisticRegression (Supervised Learning)')

    review_rows = reviews if reviews else _default_reviews()

    texts = [
        str(row.get('reviewText', '')).lower().strip()
        for row in review_rows if row.get('reviewText')
    ]

    labels = [
        str(row.get('sentimentLabel', 'neutral')).lower().strip()
        for row in review_rows if row.get('reviewText')
    ]

    if len(texts) < 3:
        fallback_rows = _default_reviews()
        texts = [row['reviewText'].lower() for row in fallback_rows]
        labels = [row['sentimentLabel'] for row in fallback_rows]

    texts, labels = _ensure_label_coverage(texts, labels)

    vectorizer = TfidfVectorizer(
        max_features=15000,
        ngram_range=(1, 2),
        sublinear_tf=True,
        strip_accents='unicode'
    )

    features = vectorizer.fit_transform(texts)

    label_counts = Counter(labels)

    should_stratify = len(label_counts) > 1 and min(label_counts.values()) >= 2

    if not should_stratify and len(label_counts) > 1:
        rare_classes = [label for label, count in label_counts.items() if count < 2]

        print(
            f"[Sentiment] Stratified split skipped due to sparse class counts: {rare_classes}. "
            "Using non-stratified split."
        )

    can_split = len(labels) >= 10 and len(set(labels)) > 1

    if can_split:
        X_train, X_test, y_train, y_test = train_test_split(
            features,
            labels,
            test_size=0.2,
            random_state=42,
            stratify=labels if should_stratify else None
        )
    else:
        X_train, y_train = features, labels
        X_test, y_test = features, labels
        print('[Sentiment] Dataset too small for stable split. Using full dataset for train/eval fallback.')

    model = LogisticRegression(
        max_iter=3000,
        class_weight='balanced',
        random_state=42,
        C=4.0
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print(f'[Sentiment] Accuracy: {accuracy:.4f}')

    bundle = {
        'model': model,
        'vectorizer': vectorizer,
        'classes': list(model.classes_)
    }

    joblib.dump(bundle, model_path)

    print(f'[Sentiment] Model saved: {model_path}')

    return bundle, accuracy


def load_sentiment_model(model_path=MODEL_PATH):

    if not os.path.exists(model_path):
        return None

    return joblib.load(model_path)


def predict_sentiment(text, model_bundle=None):

    bundle = model_bundle or load_sentiment_model()

    if bundle is None:
        bundle, _ = train_sentiment_model(_default_reviews())

    text_value = str(text or '').lower().strip()

    if text_value == '':
        text_value = 'average'

    vectorized = bundle['vectorizer'].transform([text_value])

    probabilities = bundle['model'].predict_proba(vectorized)[0]

    classes = list(bundle['model'].classes_)

    class_probabilities = {
        'positive': 0.0,
        'neutral': 0.0,
        'negative': 0.0
    }

    for index, class_name in enumerate(classes):
        class_probabilities[class_name] = float(probabilities[index])

    label_index = int(np.argmax(probabilities))

    label = classes[label_index]

    confidence = float(probabilities[label_index])

    if NEUTRAL_HINT_REGEX.search(text_value):
        weak_signal = confidence < 0.72
        close_competition = abs(class_probabilities['positive'] - class_probabilities['negative']) < 0.28

        if weak_signal or close_competition:
            class_probabilities = {
                'positive': 0.15,
                'neutral': 0.70,
                'negative': 0.15
            }
            label = 'neutral'
            confidence = class_probabilities['neutral']

    return {
        'label': label,
        'confidence': confidence,
        'probabilities': {
            'positive': class_probabilities['positive'],
            'neutral': class_probabilities['neutral'],
            'negative': class_probabilities['negative']
        }
    }