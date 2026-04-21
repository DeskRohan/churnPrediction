import joblib
import pandas as pd
import sys
import json
import os

BASE_DIR = os.path.dirname(__file__)
model_path = os.path.join(BASE_DIR, "model.pkl")
model = joblib.load(model_path)

input_data = json.loads(sys.argv[1])
df = pd.DataFrame([input_data])

prediction = model.predict(df)[0]
prob = model.predict_proba(df)[0][1]

risk = "Low"
if prob > 0.7:
    risk = "High"
elif prob > 0.3:
    risk = "Medium"

recommendation = "Maintain engagement"
if risk == "High":
    recommendation = "Offer discount / contact customer"

print(json.dumps({
    "churn": int(prediction),
    "probability": float(prob),
    "risk": risk,
    "recommendation": recommendation
}))