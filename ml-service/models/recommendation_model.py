import os
import joblib
import numpy as np
import pandas as pd
from surprise import Dataset, Reader, SVD
from surprise.model_selection import cross_validate

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'recommendation_model.pkl')


def _default_reviews():
    return [
        {'customerId': 'c1', 'dishId': 'd1', 'rating': 5},
        {'customerId': 'c1', 'dishId': 'd2', 'rating': 4},
        {'customerId': 'c2', 'dishId': 'd1', 'rating': 4},
        {'customerId': 'c2', 'dishId': 'd3', 'rating': 5},
        {'customerId': 'c3', 'dishId': 'd2', 'rating': 3},
        {'customerId': 'c3', 'dishId': 'd3', 'rating': 4}
    ]


def train_recommendation_model(reviews, model_path=MODEL_PATH):
    # Recommend → SVD Matrix Factorization — Collaborative Filtering
    print('[Recommend] Starting training using SVD Matrix Factorization (Collaborative Filtering)')

    rows = []
    for row in (reviews or _default_reviews()):
        customer_id = row.get('customerId')
        dish_id = row.get('dishId')
        rating = row.get('rating')
        if customer_id and dish_id and rating is not None:
            rows.append({
                'customerId': str(customer_id),
                'dishId': str(dish_id),
                'rating': float(rating)
            })

    if len(rows) < 5:
        rows.extend(_default_reviews())

    df = pd.DataFrame(rows).drop_duplicates(subset=['customerId', 'dishId'], keep='last')

    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df[['customerId', 'dishId', 'rating']], reader)

    algo = SVD(n_factors=50, n_epochs=20, random_state=42)

    try:
        cv_result = cross_validate(algo, data, measures=['RMSE'], cv=3, verbose=False)
        rmse = float(np.mean(cv_result['test_rmse']))
    except Exception:
        rmse = 0.0

    trainset = data.build_full_trainset()
    algo.fit(trainset)

    dish_avg = df.groupby('dishId')['rating'].mean().to_dict()
    known_users = set(df['customerId'].astype(str).tolist())

    bundle = {
        'algo': algo,
        'dish_avg': dish_avg,
        'global_avg': float(df['rating'].mean()),
        'known_users': known_users
    }

    joblib.dump(bundle, model_path)
    print(f'[Recommend] RMSE: {rmse:.4f}')
    print(f'[Recommend] Model saved: {model_path}')

    return bundle, rmse


def load_recommendation_model(model_path=MODEL_PATH):
    if not os.path.exists(model_path):
        return None
    return joblib.load(model_path)


def get_recommendations(customer_id, all_dish_ids, reviewed_dish_ids, top_n=5, model_bundle=None):
    bundle = model_bundle or load_recommendation_model()
    if bundle is None:
        bundle, _ = train_recommendation_model(_default_reviews())

    all_ids = [str(dish_id) for dish_id in (all_dish_ids or [])]
    reviewed = {str(dish_id) for dish_id in (reviewed_dish_ids or [])}

    candidates = [dish_id for dish_id in all_ids if dish_id not in reviewed]
    if not candidates:
        return []

    customer_key = str(customer_id)

    recommendations = []
    if customer_key in bundle['known_users']:
        for dish_id in candidates:
            prediction = bundle['algo'].predict(customer_key, str(dish_id))
            predicted_rating = float(prediction.est)
            confidence = max(0.0, min(1.0, (predicted_rating - 1.0) / 4.0))
            recommendations.append({
                'dishId': str(dish_id),
                'predictedRating': round(predicted_rating, 4),
                'confidence': round(confidence, 4)
            })
        recommendations.sort(key=lambda item: item['predictedRating'], reverse=True)
    else:
        for dish_id in candidates:
            avg_rating = float(bundle['dish_avg'].get(str(dish_id), bundle['global_avg']))
            confidence = max(0.0, min(1.0, (avg_rating - 1.0) / 4.0))
            recommendations.append({
                'dishId': str(dish_id),
                'predictedRating': round(avg_rating, 4),
                'confidence': round(confidence, 4)
            })
        recommendations.sort(key=lambda item: item['predictedRating'], reverse=True)

    return recommendations[:max(1, int(top_n))]
