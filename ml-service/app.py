import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from models.sentiment_model import load_sentiment_model, predict_sentiment
from models.recommendation_model import load_recommendation_model, get_recommendations
from train import train_all_models, DATA_PATH

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

app = Flask(__name__)
CORS(app, resources={r"/ml/*": {"origins": ["http://localhost:5000"]}})

MODELS = {
    'sentiment': None,
    'recommendation': None
}


def success_response(data=None, status=200):
    return jsonify({
        'success': True,
        'data': data,
        'error': None
    }), status


def error_response(error_message, status=400):
    return jsonify({
        'success': False,
        'data': None,
        'error': str(error_message)
    }), status


def load_or_train_models():
    print('[App] Loading models at startup...')
    sentiment_bundle = load_sentiment_model()
    recommendation_bundle = load_recommendation_model()

    if not sentiment_bundle or not recommendation_bundle:
        print('[App] One or more model files missing. Triggering training...')
        train_all_models(DATA_PATH)
        sentiment_bundle = load_sentiment_model()
        recommendation_bundle = load_recommendation_model()

    MODELS['sentiment'] = sentiment_bundle
    MODELS['recommendation'] = recommendation_bundle

    loaded = all(MODELS.values())
    print(f'[App] Models loaded: {loaded}')
    return loaded


@app.route('/ml/health', methods=['GET'])
def health():
    loaded = all(MODELS.values())
    return success_response({
        'status': 'ok',
        'models_loaded': loaded
    })


@app.route('/ml/sentiment', methods=['POST'])
def sentiment_endpoint():
    try:
        payload = request.get_json(silent=True) or {}
        text = payload.get('text', '')
        if not str(text).strip():
            return error_response('text is required', 400)

        result = predict_sentiment(text, MODELS['sentiment'])
        return success_response(result)
    except Exception as error:
        return error_response(error, 500)


@app.route('/ml/recommend', methods=['POST'])
def recommend_endpoint():
    try:
        payload = request.get_json(silent=True) or {}
        customer_id = payload.get('customerId')
        all_dish_ids = payload.get('allDishIds', [])
        reviewed_dish_ids = payload.get('reviewedDishIds', [])
        top_n = payload.get('topN', 5)

        if not customer_id:
            return error_response('customerId is required', 400)

        recommendations = get_recommendations(
            customer_id,
            all_dish_ids,
            reviewed_dish_ids,
            top_n=top_n,
            model_bundle=MODELS['recommendation']
        )
        return success_response(recommendations)
    except Exception as error:
        return error_response(error, 500)


if __name__ == '__main__':
    load_or_train_models()
    port = int(os.getenv('PORT', '5001'))
    app.run(host='0.0.0.0', port=port, debug=False)
