import json
import os

translations = {
    "Welcome back, ": "वापसी पर स्वागत है, ",
    "Connect with neighbors heading your way. Save time, reduce costs, and build a tighter village.": "अपने रास्ते जाने वाले पड़ोसियों से जुड़ें। समय बचाएं, लागत कम करें, और एक मजबूत गांव बनाएं।",
    "My Dashboard": "मेरा डैशबोर्ड",
    "Live Road Conditions": "सड़क की लाइव स्थिति",
    "Active Activity": "सक्रिय गतिविधि",
    "No active rides or requests.": "कोई सक्रिय सवारी या अनुरोध नहीं।",
    "Help the community to earn Karma!": "कर्म अर्जित करने के लिए समुदाय की मदद करें!",
    "Offering Ride": "सवारी की पेशकश",
    "Cancel Ride": "सवारी रद्द करें",
    "Complete Journey": "यात्रा पूरी करें",
    "Open Secure Chat": "सुरक्षित चैट खोलें",
    "Pending Requests:": "लंबित अनुरोध:",
    "Trust: ⭐ ": "विश्वास: ⭐ ",
    "Accept": "स्वीकार करें",
    "Seeking Ride": "सवारी की तलाश में",
    "(Refunded)": "(वापस किया गया)",
    "(Escrow)": "(एस्क्रो)",
    "How was your ride?": "आपकी सवारी कैसी रही?",
    "Submit Rating": "रेटिंग सबमिट करें",
    "You rated this ride ": "आपने इस सवारी को रेटिंग दी है ",
    "Find a Ride": "सवारी खोजें",
    "Need to get to the market or the next town? See who's heading that way.": "क्या बाज़ार या अगले शहर जाना है? देखें कि कौन उस रास्ते जा रहा है।",
    "Search Routes": "मार्ग खोजें",
    "Offer a Ride": "सवारी की पेशकश करें",
    "Have an empty seat on your bike or tractor? Offer it to a neighbor and earn Karma.": "क्या आपकी बाइक या ट्रैक्टर पर खाली सीट है? किसी पड़ोसी को दें और कर्म कमाएं।",
    "Post Your Route": "अपना मार्ग पोस्ट करें",
    "Request a Ride": "सवारी का अनुरोध करें",
    "Post an alert for a specific destination and let helpers find you.": "किसी विशिष्ट गंतव्य के लिए अलर्ट पोस्ट करें और सहायकों को आपको ढूंढने दें।",
    "Create Alert": "अलर्ट बनाएं",
    "Report Road Condition": "सड़क की स्थिति की रिपोर्ट करें",
    "Alert the village about landslides, construction, or blockages on the route.": "गांव को मार्ग पर भूस्खलन, निर्माण या रुकावटों के बारे में सचेत करें।",
    "Report Issue": "समस्या की रिपोर्ट करें",
    "Community-reported alerts for routes in the village.": "गांव में मार्गों के लिए समुदाय द्वारा रिपोर्ट किए गए अलर्ट।",
    "Reported by ": "द्वारा रिपोर्ट किया गया "
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

# Now, we manually replace in dashboard.html. We will do this via a script to save time.
# But since HTML replacements can be tricky with whitespaces, we'll write exact replace pairs.

replacements = [
    ("Welcome back, ", "{{ t('Welcome back, ') }}"),
    ("Connect with neighbors heading your way. Save time, reduce costs, and build a tighter village.", "{{ t('Connect with neighbors heading your way. Save time, reduce costs, and build a tighter village.') }}"),
    ("My Dashboard\n            </button>", "{{ t('My Dashboard') }}\n            </button>"),
    ("Live Road Conditions\n            </button>", "{{ t('Live Road Conditions') }}\n            </button>"),
    ("Active Activity</h3>", "{{ t('Active Activity') }}</h3>"),
    ("No active rides or requests.</p>", "{{ t('No active rides or requests.') }}</p>"),
    ("Help the community to earn Karma!</p>", "{{ t('Help the community to earn Karma!') }}</p>"),
    (">Offering Ride</span>", ">{{ t('Offering Ride') }}</span>"),
    ("Cancel Ride\n                        </button>", "{{ t('Cancel Ride') }}\n                        </button>"),
    ("Complete Journey\n                            </button>", "{{ t('Complete Journey') }}\n                            </button>"),
    ("Open Secure Chat\n                        </a>", "{{ t('Open Secure Chat') }}\n                        </a>"),
    ("Pending Requests:</p>", "{{ t('Pending Requests:') }}</p>"),
    ("Trust: ⭐ ", "{{ t('Trust: ⭐ ') }}"),
    ("Accept\n                                            </button>", "{{ t('Accept') }}\n                                            </button>"),
    (">Seeking Ride</span>", ">{{ t('Seeking Ride') }}</span>"),
    ("(Refunded)", "{{ t('(Refunded)') }}"),
    ("(Escrow)", "{{ t('(Escrow)') }}"),
    ("How was your ride?</p>", "{{ t('How was your ride?') }}</p>"),
    ("Submit Rating</button>", "{{ t('Submit Rating') }}</button>"),
    ("You rated this ride ", "{{ t('You rated this ride ') }}"),
    (">Find a Ride</h3>", ">{{ t('Find a Ride') }}</h3>"),
    (">Need to get to the market or the next town? See who's heading that way.</p>", ">{{ t(\"Need to get to the market or the next town? See who's heading that way.\") }}</p>"),
    ("<span>Search Routes</span>", "<span>{{ t('Search Routes') }}</span>"),
    (">Offer a Ride</h3>", ">{{ t('Offer a Ride') }}</h3>"),
    (">Have an empty seat on your bike or tractor? Offer it to a neighbor and earn Karma.</p>", ">{{ t('Have an empty seat on your bike or tractor? Offer it to a neighbor and earn Karma.') }}</p>"),
    ("<span>Post Your Route</span>", "<span>{{ t('Post Your Route') }}</span>"),
    (">Request a Ride</h3>", ">{{ t('Request a Ride') }}</h3>"),
    (">Post an alert for a specific destination and let helpers find you.</p>", ">{{ t('Post an alert for a specific destination and let helpers find you.') }}</p>"),
    ("<span>Create Alert</span>", "<span>{{ t('Create Alert') }}</span>"),
    (">Report Road Condition</h3>", ">{{ t('Report Road Condition') }}</h3>"),
    (">Alert the village about landslides, construction, or blockages on the route.</p>", ">{{ t('Alert the village about landslides, construction, or blockages on the route.') }}</p>"),
    ("<span>Report Issue</span>", "<span>{{ t('Report Issue') }}</span>"),
    (">Live Road Conditions</h3>", ">{{ t('Live Road Conditions') }}</h3>"),
    (">Community-reported alerts for routes in the village.</p>", ">{{ t('Community-reported alerts for routes in the village.') }}</p>"),
    ("Reported by ", "{{ t('Reported by ') }}")
]

with open('templates/dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

for old, new in replacements:
    content = content.replace(old, new)

with open('templates/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done translating dashboard.html")
