import json
import os
import re
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, 'training_data.json')


POSITIVE_PATTERNS = [
    'amazing', 'excellent', 'great', 'good', 'tasty', 'delicious', 'loved', 'perfect',
    'satisfying', 'fresh', 'flavorful', 'crispy', 'awesome', 'wonderful'
]

NEGATIVE_PATTERNS = [
    'bad', 'poor', 'terrible', 'worst', 'stale', 'bland', 'oily', 'watery',
    'disappoint', 'awful', 'cold', 'unhappy', 'not worth', 'regret', 'not good'
]


def derive_sentiment_label(review_text, rating):
    text = str(review_text or '').lower().strip()
    score = 0

    if re.search(r'\bnot\s+bad\b', text):
        score += 2

    if re.search(r'\bnot\s+good\b', text):
        score -= 2

    positive_hits = sum(1 for token in POSITIVE_PATTERNS if token in text)
    negative_hits = sum(1 for token in NEGATIVE_PATTERNS if token in text)
    score += (positive_hits - negative_hits)

    try:
        rating_value = int(rating)
    except Exception:
        rating_value = 3

    if rating_value >= 4:
        score += 2
    elif rating_value <= 2:
        score -= 2

    if score >= 1:
        return 'positive'
    if score <= -1:
        return 'negative'
    return 'neutral'


def serialize(value):
    if isinstance(value, dict):
        return {key: serialize(val) for key, val in value.items()}
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()

    if hasattr(value, 'isoformat') and callable(getattr(value, 'isoformat')):
        try:
            return value.isoformat()
        except Exception:
            return str(value)

    if hasattr(value, 'binary') and hasattr(value, 'generation_time'):
        return str(value)

    return value


def main():
    load_dotenv(os.path.join(BASE_DIR, '.env'))
    mongo_uri = os.getenv('MONGO_URI') or os.getenv('MONGODB_URI')

    if not mongo_uri:
        raise ValueError('MONGO_URI (or MONGODB_URI) not found in ml-service/.env')

    print('[Exporter] Connecting to MongoDB...')
    client = MongoClient(mongo_uri)

    db_name = None
    try:
        default_db = client.get_default_database()
        if default_db is not None:
            db_name = default_db.name
    except Exception:
        db_name = None

    if not db_name:
        uri_tail = mongo_uri.rsplit('/', 1)[-1].split('?')[0].strip()
        if uri_tail and uri_tail not in [':', '/', 'mongodb.net', 'localhost:27017']:
            db_name = uri_tail

    explicit_db = os.getenv('MONGO_DB', '').strip()
    if explicit_db:
        db_name = explicit_db

    if not db_name:
        print('[Exporter] No explicit DB in URI/env. Auto-detecting database with reviews/customers...')
        best_db = None
        best_score = -1

        for candidate in client.list_database_names():
            db = client[candidate]
            collections = set(db.list_collection_names())
            if 'reviews' not in collections and 'customers' not in collections:
                continue

            review_count = db['reviews'].count_documents({}) if 'reviews' in collections else 0
            customer_count = db['customers'].count_documents({}) if 'customers' in collections else 0
            score = review_count + customer_count

            if score > best_score:
                best_score = score
                best_db = candidate

        db_name = best_db or 'test'

    print(f'[Exporter] Using database: {db_name}')

    database = client[db_name]

    review_docs = list(database['reviews'].find({}))
    customer_docs = list(database['customers'].find({}))

    reviews = []
    for row in review_docs:
        review_text = str(row.get('reviewText', ''))
        rating = row.get('rating', 0)
        derived_label = derive_sentiment_label(review_text, rating)

        reviews.append({
            'reviewText': review_text,
            'sentimentLabel': derived_label,
            'customerId': str(row.get('customerId', '')),
            'dishId': str(row.get('dish', '')),
            'rating': rating,
            'createdAt': serialize(row.get('createdAt')),
            'sentimentScore': (row.get('sentiment') or {}).get('score', 0)
        })

    customers = []
    for row in customer_docs:
        customers.append({
            'customerId': str(row.get('_id')),
            'createdAt': serialize(row.get('createdAt')),
            'lastLogin': serialize(row.get('lastLogin'))
        })

    payload = {
        'reviews': reviews,
        'customers': customers
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as file:
        json.dump(payload, file, indent=2)

    print(f'[Exporter] Exported reviews: {len(reviews)}')
    print(f'[Exporter] Exported customers: {len(customers)}')
    print(f'[Exporter] Saved dataset to: {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
