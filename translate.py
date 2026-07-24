import json
import os

# Dictionary of translations to add. Key: English string (used as key in JSON), Value: Hindi translation
translations = {
    "Shared Journeys,": "साझा यात्राएं,",
    "Stronger Bonds": "मजबूत रिश्ते",
    "Discover a new way to travel where neighbors help neighbors. No money involved—just goodwill, mutual trust, and a shared journey on the rural roads we all call home.": "यात्रा करने का एक नया तरीका खोजें जहां पड़ोसी पड़ोसियों की मदद करते हैं। कोई पैसा शामिल नहीं - बस सद्भावना, आपसी विश्वास, और ग्रामीण सड़कों पर एक साझा यात्रा जिसे हम सभी घर कहते हैं।",
    "Join the Village": "गांव से जुड़ें",
    "Log In": "लॉग इन",
    "Why We Built KarmaRide": "हमने कर्मा-राइड क्यों बनाया?",
    "In many of our villages, owning a personal vehicle is a luxury, and public transport is often sparse or non-existent. For many, the places they call home are beautiful but disconnected, connected only by roads that are sometimes tough to navigate.": "हमारे कई गाँवों में, अपना निजी वाहन होना एक विलासिता है, और सार्वजनिक परिवहन अक्सर बहुत कम या न के बराबर होता है। बहुत से लोगों के लिए, उनका सुंदर घर बाकी दुनिया से कटा हुआ है, जो केवल उन रास्तों से जुड़ा है जिन पर चलना कभी-कभी बहुत मुश्किल होता है।",
    "Every day, neighbors face urgent situations—needing to reach a clinic, a market, or family—but find themselves stranded simply because there is no reliable commute. We realized that while not everyone has a vehicle, ": "हर दिन, लोगों को कई बार आपात स्थिति का सामना करना पड़ता है - जैसे क्लिनिक, बाज़ार, या परिवार तक पहुँचना - लेकिन वे फँसे रह जाते हैं क्योंकि यात्रा का कोई साधन नहीं होता। हमने महसूस किया कि भले ही हर किसी के पास वाहन न हो, लेकिन ",
    "someone in the village is often heading that way.": "गाँव में कोई न कोई अक्सर उसी दिशा में जा रहा होता है।",
    "KarmaRide was created to bridge this gap. By sharing the empty seats on our vehicles, we turn every everyday journey into a lifeline for a neighbor in need.": "कर्मा-राइड को इसी दूरी को मिटाने के लिए बनाया गया था। अपने वाहनों की खाली सीटों को साझा करके, हम हर रोज़ की यात्रा को किसी जरूरतमंद पड़ोसी के लिए जीवनरेखा में बदल देते हैं।",
    "The Heart of KarmaRide": "कर्मा-राइड का हृदय",
    "Community First": "समुदाय पहले",
    "Strengthening local ties by connecting those going the same way. It's about being a good neighbor before being a commuter.": "उसी रास्ते जाने वालों को जोड़कर स्थानीय संबंधों को मजबूत करना। यह एक यात्री होने से पहले एक अच्छा पड़ोसी होने के बारे में है।",
    "The Karma Economy": "कर्म अर्थव्यवस्था",
    "Leave your wallet behind. Earn Karma points for giving rides, and spend them when you need one. A true shared economy.": "अपना बटुआ पीछे छोड़ दें। सवारी देने के लिए कर्म अंक अर्जित करें, और जब आपको आवश्यकता हो तो उन्हें खर्च करें। एक सच्ची साझा अर्थव्यवस्था।",
    "Safe & Trusted": "सुरक्षित और विश्वसनीय",
    "Travel with peace of mind. Every rider and driver is a verified member of the village network, building a secure travel web.": "मन की शांति के साथ यात्रा करें। हर सवार और ड्राइवर ग्राम नेटवर्क का एक सत्यापित सदस्य है, जो एक सुरक्षित यात्रा वेब का निर्माण कर रहा है।",
    "How the Journey Unfolds": "यात्रा कैसे खुलती है",
    "Got an empty seat on your scooter? Post your route to the village board.": "क्या आपके स्कूटर पर कोई खाली सीट है? ग्राम बोर्ड पर अपना मार्ग पोस्ट करें।",
    "Earn Karma": "कर्म कमाएं",
    "Help a neighbor reach the market or clinic, and watch your Karma pool grow.": "किसी पड़ोसी को बाज़ार या क्लिनिक तक पहुँचने में मदद करें, और अपने कर्म पूल को बढ़ते हुए देखें।",
    "Build Reputation": "प्रतिष्ठा बनाएं",
    "Become a pillar of your community. Higher karma means prioritized ride requests.": "अपने समुदाय के एक स्तंभ बनें। उच्च कर्म का अर्थ है प्राथमिकता वाली सवारी अनुरोध।",
    "Rise to ": "उठो ",
    "Karma Hero": "कर्म नायक",
    "Karma isn't just points; it's gratitude materialized. The more you give, the brighter your status shines on the village leaderboard.": "कर्म केवल अंक नहीं है; यह साकार कृतज्ञता है। जितना अधिक आप देते हैं, गांव के लीडरबोर्ड पर आपकी स्थिति उतनी ही उज्ज्वल होती है।",
    "Weekly Honors": "साप्ताहिक सम्मान",
    "Top contributors get featured on the community board.": "शीर्ष योगदानकर्ताओं को सामुदायिक बोर्ड पर प्रदर्शित किया जाता है।",
    "Priority Requests": "प्राथमिकता अनुरोध",
    "Karma Heroes get their ride requests answered first.": "कर्म नायकों को उनके सवारी अनुरोधों का उत्तर पहले मिलता है।",
    "Live Leaderboard": "लाइव लीडरबोर्ड",
    "Village Top Samaritans": "गाँव के शीर्ष सामरी",
    "No heroes yet!": "अभी तक कोई नायक नहीं!",
    "Ready to share the road?": "सड़क साझा करने के लिए तैयार हैं?",
    "Whether you have an empty seat or need a lift to the nearest town, the village is waiting for you.": "चाहे आपके पास खाली सीट हो या निकटतम शहर में लिफ्ट की आवश्यकता हो, गांव आपका इंतजार कर रहा है।",
    "Start Offering Rides": "सवारी की पेशकश शुरू करें"
}

# Update JSON files
def update_json(filepath, new_data):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = {}
        
    for k, v in new_data.items():
        data[k] = v
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_json('locales/en.json', {k: k for k in translations.keys()})
update_json('locales/hi.json', translations)

# We will handle landing.html replacement next
