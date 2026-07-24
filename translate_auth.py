import json
import os

translations = {
    "Welcome Back": "वापसी पर स्वागत है",
    "Sign in to coordinate your next ride.": "अपनी अगली सवारी के समन्वय के लिए साइन इन करें।",
    "Phone Number": "फ़ोन नंबर",
    "Enter your phone": "अपना फोन दर्ज करें",
    "Password": "पासवर्ड",
    "Enter your password": "अपना पासवर्ड दर्ज करें",
    "Sign In": "साइन इन",
    "Don't have an account? ": "क्या आपके पास खाता नहीं है? ",
    "Register": "रजिस्टर करें",
    "Create Account": "खाता बनाएं",
    "Join the community. Earn ": "समुदाय में शामिल हों। कमाएं ",
    "50 Karma": "50 कर्म",
    " instantly!": " तुरंत!",
    "Full Name": "पूरा नाम",
    "e.g. Alex Helper": "जैसे एलेक्स हेल्पर",
    "Email (Optional)": "ईमेल (वैकल्पिक)",
    "Enter your email": "अपना ईमेल दर्ज करें",
    "Create a password": "पासवर्ड बनाएं",
    "Already have an account? ": "क्या आपके पास पहले से एक खाता है? "
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

login_replacements = [
    (">Welcome Back</h1>", ">{{ t('Welcome Back') }}</h1>"),
    (">Sign in to coordinate your next ride.</p>", ">{{ t('Sign in to coordinate your next ride.') }}</p>"),
    (">Phone Number</label>", ">{{ t('Phone Number') }}</label>"),
    ('placeholder="Enter your phone"', 'placeholder="{{ t(\'Enter your phone\') }}"'),
    (">Password</label>", ">{{ t('Password') }}</label>"),
    ('placeholder="Enter your password"', 'placeholder="{{ t(\'Enter your password\') }}"'),
    ("Sign In\n        </button>", "{{ t('Sign In') }}\n        </button>"),
    ("Don't have an account? ", "{{ t(\"Don't have an account? \") }}"),
    (">Register</a>", ">{{ t('Register') }}</a>")
]

register_replacements = [
    (">Create Account</h1>", ">{{ t('Create Account') }}</h1>"),
    (">Join the community. Earn ", ">{{ t('Join the community. Earn ') }}"),
    (">50 Karma</span>", ">{{ t('50 Karma') }}</span>"),
    (" instantly!</p>", "{{ t(' instantly!') }}</p>"),
    (">Full Name</label>", ">{{ t('Full Name') }}</label>"),
    ('placeholder="e.g. Alex Helper"', 'placeholder="{{ t(\'e.g. Alex Helper\') }}"'),
    (">Phone Number</label>", ">{{ t('Phone Number') }}</label>"),
    ('placeholder="Enter your phone"', 'placeholder="{{ t(\'Enter your phone\') }}"'),
    (">Email (Optional)</label>", ">{{ t('Email (Optional)') }}</label>"),
    ('placeholder="Enter your email"', 'placeholder="{{ t(\'Enter your email\') }}"'),
    (">Password</label>", ">{{ t('Password') }}</label>"),
    ('placeholder="Create a password"', 'placeholder="{{ t(\'Create a password\') }}"'),
    ("Create Account\n        </button>", "{{ t('Create Account') }}\n        </button>"),
    ("Already have an account? ", "{{ t('Already have an account? ') }}"),
    (">Sign In</a>", ">{{ t('Sign In') }}</a>")
]

def apply_replacements(filename, rep_list):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in rep_list:
        content = content.replace(old, new)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

apply_replacements('templates/login.html', login_replacements)
apply_replacements('templates/register.html', register_replacements)

print("Done translating login and register")
