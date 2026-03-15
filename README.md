# Jothi Bavan Hotel Management System

MERN + Flask ML application for hotel operations, customer feedback, and dish recommendations.

---

## 1) Project Features

### A. Authentication & Roles
- Admin login with JWT
- Customer registration/login with JWT
- Admin and customer sessions are handled separately

### B. Public Website
- Dynamic home page content from settings
- Public menu (active/available dishes)
- Public customer reviews (only reviews not hidden by admin)

### C. Dish Management (Admin)
- Create, update, delete dishes
- Toggle dish active/inactive status
- Toggle dish availability
- Dish image upload support

### D. Reviews & Sentiment
- Customers submit reviews with rating + text
- Sentiment analysis during review creation
- Primary: ML sentiment service (`/ml/sentiment`)
- Fallback: local rule-based sentiment if ML is down (review creation never fails)

### E. Order Management
- Customer: place order, view order history, cancel pending orders
- Admin: view all orders, filter orders, update order status
- Admin order stats: totals, revenue, status breakdown, top ordered dishes

### F. Recommendation Engine
- Personalized dish recommendations for logged-in customers
- Excludes dishes already reviewed by that customer
- Popular dishes endpoint based on review aggregates
- ML recommendation endpoint: `/ml/recommend`

---

## 2) Tech Stack

- **Frontend**: React
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **ML Service**: Python Flask
- **ML Models**:
	- Sentiment: TF-IDF + Multinomial Naive Bayes
	- Recommendation: SVD collaborative filtering (`scikit-surprise`)

---

## 3) Environment Configuration

### Backend: `backend/.env`
```env
PORT=5000
MONGODB_URI=<your_mongodb_uri>
JWT_SECRET=<your_secret>
NODE_ENV=development
ML_SERVICE_URL=http://localhost:5001
RAZORPAY_KEY_ID=<your_razorpay_test_key_id>
RAZORPAY_KEY_SECRET=<your_razorpay_test_key_secret>
```

### ML Service: `ml-service/.env`
```env
PORT=5001
MONGO_URI=<your_mongodb_uri>
MONGO_DB=test
```

> `MONGO_DB=test` ensures exporter uses your app DB and not sample Atlas databases.

---

## 4) Installation

From project root:

```bash
npm install
cd frontend && npm install && cd ..
cd ml-service
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
cd ..
```

### Windows notes (PowerShell)
Use Windows venv paths and install ML dependencies like this:

```powershell
cd ml-service
# Use Python 3.10/3.11 for scikit-surprise compatibility
py -3.10 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
.
```

If you already created `venv` with Python 3.13, recreate it with Python 3.10:

```powershell
cd ml-service
Remove-Item -Recurse -Force venv
py -3.10 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

If installation fails at `scikit-surprise` with `Microsoft Visual C++ 14.0 or greater is required`, install **Microsoft C++ Build Tools** (Desktop development with C++), restart terminal, then run:

```powershell
.\venv\Scripts\python.exe -m pip install scikit-surprise
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```


---

## 5) Run the Project (Recommended Order)

### Step 1: Seed application data (optional but recommended)
```bash
cd backend
node seed.js
cd ..
```

### Step 2: Seed additional test data for recommendations
```bash
npm run seed:test-data
npm run seed:recommendation-data
```

### Step 3: Export DB data for ML training
```bash
cd ml-service
./venv/bin/python data_exporter.py
```

### Step 4: Train ML models
```bash
./venv/bin/python train.py
```

### Step 5: Start ML service
```bash
./venv/bin/python app.py
```

### Step 6: Start backend (new terminal)
```bash
cd backend
node server.js
```

### Step 7: Start frontend (new terminal)
```bash
cd frontend
npm start
```

---

## 6) Health Checks

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/health`
- ML health: `http://localhost:5001/ml/health`

---

## 7) Key API Summary

### Public
- `GET /api/settings`
- `GET /api/dishes/active`
- `GET /api/reviews/public`
- `POST /api/reviews`
- `GET /api/recommendations/popular`

### Customer (JWT)
- `POST /api/customer/register`
- `POST /api/customer/login`
- `GET /api/customer/me`
- `GET /api/reviews/customer/my-reviews`
- `POST /api/orders`
- `POST /api/orders/payment/create-order`
- `POST /api/orders/payment/verify`
- `GET /api/orders/my`
- `PATCH /api/orders/my/:orderId/cancel`
- `GET /api/recommendations/my`

### Admin (JWT)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/dashboard`
- `GET /api/reviews`
- `PATCH /api/reviews/:id/visibility`
- `POST /api/dishes`
- `PUT /api/dishes/:id`
- `DELETE /api/dishes/:id`
- `GET /api/orders`
- `PATCH /api/orders/:orderId/status`
- `GET /api/orders/stats`

### ML Service
- `GET /ml/health`
- `POST /ml/sentiment`
- `POST /ml/recommend`

---

## 8) Default Admin Credentials

- Email: `admin@jothibavan.com`
- Password: `admin123`

Change after first login.

---

## 9) Common Troubleshooting

- **`data_exporter.py` gives wrong counts**
	- Ensure `ml-service/.env` has `MONGO_DB=test`

- **`ModuleNotFoundError: surprise`**
	- Install in venv: `./venv/bin/python -m pip install -r requirements.txt`
	- On Windows use: `.\\venv\\Scripts\\python.exe -m pip install -r requirements.txt`

- **`Failed building wheel for scikit-surprise` / `Microsoft Visual C++ 14.0 or greater is required`**
	- Install Microsoft C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
	- Reopen terminal and reinstall in venv

- **`scikit-surprise` fails with Cython error (for example: `co_clustering.pyx: Invalid type`)**
	- This usually means the venv is on Python `3.13` (unsupported for this package)
	- Recreate venv with Python `3.10` and reinstall:
		- `Remove-Item -Recurse -Force venv`
		- `py -3.10 -m venv venv`
		- `.\\venv\\Scripts\\python.exe -m pip install -r requirements.txt`

- **NumPy/surprise import error**
	- Requirements already pinned to `numpy<2`
	- Reinstall in venv if needed

- **ML not affecting recommendations/sentiment**
	- Confirm ML service is running on port `5001`
	- Check `/ml/health`

---

## License
ISC
