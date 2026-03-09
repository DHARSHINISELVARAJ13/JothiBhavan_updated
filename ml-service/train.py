import json
import os
from models.sentiment_model import train_sentiment_model, MODEL_PATH as SENTIMENT_MODEL_PATH
from models.recommendation_model import train_recommendation_model, MODEL_PATH as RECOMMEND_MODEL_PATH

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'training_data.json')


def load_training_data(data_path=DATA_PATH):
    if not os.path.exists(data_path):
        print(f'[Train] training_data.json not found at {data_path}. Using fallback samples.')
        return {'reviews': [], 'customers': []}

    with open(data_path, 'r', encoding='utf-8') as file:
        data = json.load(file)

    reviews = data.get('reviews', [])
    customers = data.get('customers', [])
    print(f'[Train] Loaded reviews: {len(reviews)}')
    print(f'[Train] Loaded customers: {len(customers)}')
    return {'reviews': reviews, 'customers': customers}


def train_all_models(data_path=DATA_PATH):
    data = load_training_data(data_path)
    reviews = data.get('reviews', [])

    print('[Train] Step 1 → Sentiment model training started')
    _, sentiment_accuracy = train_sentiment_model(reviews, SENTIMENT_MODEL_PATH)
    print(f'[Train] Step 1 complete → Sentiment accuracy: {sentiment_accuracy:.4f}')

    print('[Train] Step 2 → Recommendation model training started')
    _, recommendation_rmse = train_recommendation_model(reviews, RECOMMEND_MODEL_PATH)
    print(f'[Train] Step 2 complete → Recommendation RMSE: {recommendation_rmse:.4f}')

    print('All models trained and saved successfully')


if __name__ == '__main__':
    train_all_models()
