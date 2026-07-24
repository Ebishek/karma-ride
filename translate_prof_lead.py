import json
import os

translations = {
    "Total Karma": "कुल कर्म",
    "Recent Rides Offered": "हाल ही में दी गई सवारी",
    "You haven't offered any rides yet.": "आपने अभी तक कोई सवारी की पेशकश नहीं की है।",
    "Recent Rides Requested": "हाल ही में अनुरोध की गई सवारी",
    "You haven't requested any rides yet.": "आपने अभी तक किसी सवारी का अनुरोध नहीं किया है।",
    "Account Settings": "खाता सेटिंग्स",
    "Email Address (Optional)": "ईमेल पता (वैकल्पिक)",
    "Change Password (Optional)": "पासवर्ड बदलें (वैकल्पिक)",
    "Current Password": "वर्तमान पासवर्ड",
    "Leave blank if not changing password": "यदि पासवर्ड नहीं बदल रहे हैं तो रिक्त छोड़ दें",
    "New Password": "नया पासवर्ड",
    "Save Changes": "परिवर्तन सहेजें",
    "Community Leaders": "सामुदायिक नेता",
    "Celebrating our top riders sharing journeys.": "यात्रा साझा करने वाले हमारे शीर्ष सवारों का जश्न मना रहे हैं।",
    "Today": "आज",
    "This Week": "इस सप्ताह",
    "This Month": "इस महीने",
    "All Time": "हर समय",
    "Your Rank": "आपकी रैंक",
    "Unranked": "बिना रैंक के",
    "Karma Points": "कर्म अंक"
}

def update_json(filepath, new_data):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = {}
    for k, v in new_data.items():
        if k not in data:
            data[k] = v
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_json('locales/en.json', {k: k for k in translations.keys()})
update_json('locales/hi.json', translations)

profile_replacements = [
    (">Total Karma</h2>", ">{{ t('Total Karma') }}</h2>"),
    (">Recent Rides Offered</h3>", ">{{ t('Recent Rides Offered') }}</h3>"),
    (">You haven't offered any rides yet.</p>", ">{{ t(\"You haven't offered any rides yet.\") }}</p>"),
    (">Recent Rides Requested</h3>", ">{{ t('Recent Rides Requested') }}</h3>"),
    (">You haven't requested any rides yet.</p>", ">{{ t(\"You haven't requested any rides yet.\") }}</p>"),
    (">Account Settings</h3>", ">{{ t('Account Settings') }}</h3>"),
    (">Full Name</label>", ">{{ t('Full Name') }}</label>"),
    (">Phone Number</label>", ">{{ t('Phone Number') }}</label>"),
    (">Email Address (Optional)</label>", ">{{ t('Email Address (Optional)') }}</label>"),
    (">Change Password (Optional)</h4>", ">{{ t('Change Password (Optional)') }}</h4>"),
    (">Current Password</label>", ">{{ t('Current Password') }}</label>"),
    ('placeholder="Leave blank if not changing password"', 'placeholder="{{ t(\'Leave blank if not changing password\') }}"'),
    (">New Password</label>", ">{{ t('New Password') }}</label>"),
    ('placeholder="New Password"', 'placeholder="{{ t(\'New Password\') }}"'),
    ("Save Changes\n            </button>", "{{ t('Save Changes') }}\n            </button>")
]

leaderboard_replacements = [
    (">Community Leaders</h2>", ">{{ t('Community Leaders') }}</h2>"),
    (">Celebrating our top riders sharing journeys.</p>", ">{{ t('Celebrating our top riders sharing journeys.') }}</p>"),
    (">Today</a>", ">{{ t('Today') }}</a>"),
    (">This Week</a>", ">{{ t('This Week') }}</a>"),
    (">This Month</a>", ">{{ t('This Month') }}</a>"),
    (">All Time</a>", ">{{ t('All Time') }}</a>"),
    (">Your Rank</p>", ">{{ t('Your Rank') }}</p>"),
    ("Unranked", "{{ t('Unranked') }}"),
    (">Karma Points</p>", ">{{ t('Karma Points') }}</p>")
]

def apply_replacements(filename, rep_list):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in rep_list:
        content = content.replace(old, new)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

apply_replacements('templates/profile.html', profile_replacements)
apply_replacements('templates/leaderboard.html', leaderboard_replacements)

print("Done translating profile and leaderboard")
