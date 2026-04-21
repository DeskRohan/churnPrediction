import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

df = pd.read_excel("churn.xlsx")

print(df.dtypes)

# Drop ID
if "CustomerID" in df.columns:
    df = df.drop("CustomerID", axis=1)

# Fix Total Charges (IMPORTANT)
df["Total Charges"] = pd.to_numeric(df["Total Charges"], errors="coerce")

# Fill missing values
df = df.fillna(0)



# Features
X = df[["Tenure Months", "Monthly Charges", "Total Charges"]]

# Target
y = df["Churn Value"]

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Accuracy
print("Accuracy:", accuracy_score(y_test, model.predict(X_test)))

# Save model
joblib.dump(model, "model.pkl")
print(" Model trained successfully")