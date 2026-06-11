# ─────────────────────────────────────────────────────────────────
#  FAQ Chatbot — Flask Backend
#  Tech Stack: Flask · NLTK · TF-IDF · Cosine Similarity
# ─────────────────────────────────────────────────────────────────

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
# pyrefly: ignore [missing-import]
import nltk
import numpy as np
import re
import string
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
# pyrefly: ignore [missing-import]
from nltk.tokenize import word_tokenize
# pyrefly: ignore [missing-import]
from nltk.corpus import stopwords
# pyrefly: ignore [missing-import]
from nltk.stem import WordNetLemmatizer


# ─────────────────────────────────────────────────────────────────
#  STEP 1 — Download required NLTK data (must happen first)
# ─────────────────────────────────────────────────────────────────

nltk.download('punkt',      quiet=True)
nltk.download('punkt_tab',  quiet=True)
nltk.download('stopwords',  quiet=True)
nltk.download('wordnet',    quiet=True)
nltk.download('omw-1.4',    quiet=True)


# ─────────────────────────────────────────────────────────────────
#  STEP 2 — Flask App Initialisation
# ─────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────────────────────────────
#  STEP 3 — FAQ Dataset  (Technology / Software Product)
# ─────────────────────────────────────────────────────────────────

FAQ_DATA = [
    {
        "id": 1,
        "category": "Account",
        "question": "How do I create an account?",
        "answer": "To create an account, click the 'Sign Up' button on the top-right corner of the homepage. Fill in your name, email address, and a secure password. You'll receive a verification email — click the link inside to activate your account.",
        "tags": ["register", "signup", "new account", "create"]
    },
    {
        "id": 2,
        "category": "Account",
        "question": "How do I reset my password?",
        "answer": "Click 'Forgot Password?' on the login page, enter your registered email, and we'll send you a password reset link. The link expires in 30 minutes. Check your spam/junk folder if you don't see it in your inbox.",
        "tags": ["password", "reset", "forgot", "change password"]
    },
    {
        "id": 3,
        "category": "Account",
        "question": "Can I change my email address?",
        "answer": "Yes! Go to Settings → Profile → Contact Information. Enter your new email address and click 'Update'. A verification link will be sent to the new address. Your old email remains active until the new one is verified.",
        "tags": ["email", "change email", "update email", "profile"]
    },
    {
        "id": 4,
        "category": "Billing",
        "question": "What payment methods do you accept?",
        "answer": "We accept all major credit/debit cards (Visa, Mastercard, American Express), PayPal, UPI, and bank transfers. For enterprise plans, we also support purchase orders and invoicing.",
        "tags": ["payment", "pay", "credit card", "billing", "invoice"]
    },
    {
        "id": 5,
        "category": "Billing",
        "question": "How do I cancel my subscription?",
        "answer": "You can cancel anytime from Settings → Billing → Cancel Subscription. Your access continues until the end of the current billing period. We don't offer partial refunds for unused time, but you won't be charged again.",
        "tags": ["cancel", "subscription", "unsubscribe", "stop billing"]
    },
    {
        "id": 6,
        "category": "Billing",
        "question": "Is there a free trial available?",
        "answer": "Yes! We offer a 14-day free trial on all paid plans. No credit card required to start. You get full access to all features during the trial. After 14 days, you can choose a plan or your account reverts to the free tier.",
        "tags": ["free trial", "trial", "try", "free", "demo"]
    },
    {
        "id": 7,
        "category": "Billing",
        "question": "How do I get a refund?",
        "answer": "Refund requests made within 7 days of purchase are processed automatically. For requests after 7 days, contact our support team at support@example.com. Refunds are credited to your original payment method within 5–10 business days.",
        "tags": ["refund", "money back", "return", "charge"]
    },
    {
        "id": 8,
        "category": "Technical",
        "question": "Which browsers are supported?",
        "answer": "We support the latest two versions of Chrome, Firefox, Safari, and Edge. For the best experience, we recommend Google Chrome. Internet Explorer is not supported.",
        "tags": ["browser", "chrome", "firefox", "safari", "edge", "support"]
    },
    {
        "id": 9,
        "category": "Technical",
        "question": "Is there a mobile app?",
        "answer": "Yes! Our mobile app is available for iOS (App Store) and Android (Google Play Store). The app supports all core features and syncs automatically with your web account in real time.",
        "tags": ["mobile", "app", "ios", "android", "phone", "tablet"]
    },
    {
        "id": 10,
        "category": "Technical",
        "question": "How do I export my data?",
        "answer": "Go to Settings → Data → Export. You can export your data as CSV, JSON, or PDF. Large exports are processed in the background and you'll receive an email with a download link when ready.",
        "tags": ["export", "download", "data", "backup", "csv", "json"]
    },
    {
        "id": 11,
        "category": "Technical",
        "question": "Is my data secure?",
        "answer": "Absolutely. We use AES-256 encryption for data at rest and TLS 1.3 for data in transit. We are SOC 2 Type II certified and GDPR compliant. Your data is backed up daily and stored across multiple geographic regions.",
        "tags": ["security", "data", "safe", "privacy", "encryption", "gdpr"]
    },
    {
        "id": 12,
        "category": "Technical",
        "question": "What is the API rate limit?",
        "answer": "API rate limits depend on your plan: Free (100 req/day), Starter (1,000 req/day), Pro (10,000 req/day), Enterprise (unlimited). Rate limit headers are included in every response. Contact us if you need a temporary increase.",
        "tags": ["api", "rate limit", "requests", "developer", "integration"]
    },
    {
        "id": 13,
        "category": "Features",
        "question": "Can I collaborate with my team?",
        "answer": "Yes! Team collaboration is supported on Starter plans and above. Invite teammates via email from Settings → Team. You can assign roles (Admin, Editor, Viewer) and set permissions at the workspace level.",
        "tags": ["team", "collaborate", "share", "members", "invite"]
    },
    {
        "id": 14,
        "category": "Features",
        "question": "Do you support dark mode?",
        "answer": "Yes! Toggle dark mode from the top navigation bar by clicking the moon icon, or set it to follow your system preference under Settings → Appearance. Your preference is saved across devices.",
        "tags": ["dark mode", "theme", "appearance", "night mode"]
    },
    {
        "id": 15,
        "category": "Features",
        "question": "Can I integrate with third-party tools?",
        "answer": "We integrate with 100+ tools including Slack, Zapier, Google Workspace, Microsoft 365, Salesforce, HubSpot, and more. Visit our Integrations page for the full list and setup guides.",
        "tags": ["integration", "slack", "zapier", "google", "connect", "third-party"]
    },
    {
        "id": 16,
        "category": "Support",
        "question": "How do I contact customer support?",
        "answer": "You can reach us via: Live Chat (available 24/7 on our website), Email at support@example.com (response within 4 hours), or Phone (Mon–Fri, 9 AM–6 PM EST). Enterprise customers get a dedicated account manager.",
        "tags": ["support", "contact", "help", "customer service", "chat"]
    },
    {
        "id": 17,
        "category": "Support",
        "question": "Where can I find documentation?",
        "answer": "Our full documentation is available at docs.example.com. It includes quick-start guides, API references, video tutorials, and a searchable knowledge base. You can also access help articles directly in the app by pressing '?' or clicking the Help icon.",
        "tags": ["documentation", "docs", "guide", "tutorial", "help center"]
    },
    {
        "id": 18,
        "category": "Account",
        "question": "How do I delete my account?",
        "answer": "To delete your account permanently, go to Settings → Account → Delete Account. You'll be asked to confirm by entering your password. All your data will be permanently deleted within 30 days per our data retention policy. This action cannot be undone.",
        "tags": ["delete", "account", "remove", "close account", "deactivate"]
    },
    {
        "id": 19,
        "category": "Billing",
        "question": "Can I upgrade or downgrade my plan?",
        "answer": "Yes! Go to Settings → Billing → Change Plan. Upgrades take effect immediately and you're charged the prorated difference. Downgrades take effect at the start of your next billing cycle. No penalty for changing plans.",
        "tags": ["upgrade", "downgrade", "plan", "change plan", "pricing"]
    },
    {
        "id": 20,
        "category": "Technical",
        "question": "Why is the app running slow?",
        "answer": "Try these steps: 1) Clear your browser cache and cookies. 2) Disable browser extensions temporarily. 3) Check your internet connection speed. 4) Try a different browser. If the issue persists, check our Status Page at status.example.com or contact support.",
        "tags": ["slow", "performance", "lag", "loading", "speed", "not working"]
    },
]


# ─────────────────────────────────────────────────────────────────
#  STEP 4 — NLP Preprocessing Pipeline
# ─────────────────────────────────────────────────────────────────

lemmatizer = WordNetLemmatizer()
stop_words  = set(stopwords.words('english'))


def preprocess(text: str) -> str:
    """Tokenize, lowercase, remove stopwords & punctuation, then lemmatize."""
    text   = text.lower()
    text   = re.sub(r'[^a-z0-9\s]', '', text)
    tokens = word_tokenize(text)
    tokens = [
        lemmatizer.lemmatize(t)
        for t in tokens
        if t not in stop_words and t not in string.punctuation and len(t) > 1
    ]
    return ' '.join(tokens)


# ─────────────────────────────────────────────────────────────────
#  STEP 5 — Build TF-IDF Matrix at Startup
# ─────────────────────────────────────────────────────────────────

# Pre-process all FAQ questions + inject tags as extra weight
processed_faq_texts = []
for faq in FAQ_DATA:
    combined = faq['question'] + ' ' + ' '.join(faq.get('tags', []))
    processed_faq_texts.append(preprocess(combined))

# Fit TF-IDF vectoriser over entire FAQ corpus (done once at startup)
vectorizer   = TfidfVectorizer(ngram_range=(1, 2))
tfidf_matrix = vectorizer.fit_transform(processed_faq_texts)


# ─────────────────────────────────────────────────────────────────
#  STEP 6 — Matching Engine
# ─────────────────────────────────────────────────────────────────

CONFIDENCE_THRESHOLD = 0.10   # below this → "not found" response


def get_confidence_label(score: float) -> str:
    """Map a similarity score to a human-readable confidence label."""
    if score >= 0.6:
        return "high"
    elif score >= 0.3:
        return "medium"
    else:
        return "low"


def find_best_match(user_query: str, top_k: int = 3):
    """Return top-k matched FAQs with similarity scores."""
    processed_query = preprocess(user_query)
    query_vec       = vectorizer.transform([processed_query])
    similarities    = cosine_similarity(query_vec, tfidf_matrix).flatten()
    top_indices     = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        score = float(similarities[idx])
        if score >= CONFIDENCE_THRESHOLD:
            results.append({
                "faq":        FAQ_DATA[idx],
                "score":      round(score, 4),
                "confidence": get_confidence_label(score),
            })
    return results


# ─────────────────────────────────────────────────────────────────
#  STEP 7 — Flask Routes
# ─────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Serve the main chat page."""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    """Accept a user message and return the best-matching FAQ answer."""
    data         = request.get_json()
    user_message = data.get('message', '').strip()

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    matches = find_best_match(user_message, top_k=3)

    if not matches:
        return jsonify({
            "status":      "not_found",
            "message":     "I'm sorry, I couldn't find a relevant answer to your question. "
                           "Please try rephrasing, or contact our support team at support@example.com.",
            "suggestions": [],
        })

    best        = matches[0]
    suggestions = [m["faq"]["question"] for m in matches[1:] if m["score"] > 0.05]

    return jsonify({
        "status":           "found",
        "answer":           best["faq"]["answer"],
        "matched_question": best["faq"]["question"],
        "category":         best["faq"]["category"],
        "confidence":       best["confidence"],
        "score":            best["score"],
        "suggestions":      suggestions,
    })


@app.route('/api/faqs', methods=['GET'])
def get_faqs():
    """Return all FAQs grouped by category."""
    categories = {}
    for faq in FAQ_DATA:
        cat = faq['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({"id": faq["id"], "question": faq["question"]})
    return jsonify(categories)


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Return high-level statistics about the FAQ corpus."""
    return jsonify({
        "total_faqs":    len(FAQ_DATA),
        "categories":    len(set(f['category'] for f in FAQ_DATA)),
        "nlp_model":     "TF-IDF + Cosine Similarity",
        "preprocessing": "NLTK Tokenization + Lemmatization + Stopword Removal",
    })


# ─────────────────────────────────────────────────────────────────
#  Entry Point
# ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("🤖 FAQ Chatbot starting on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)