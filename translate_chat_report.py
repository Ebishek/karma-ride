import json
import os

translations = {
    "Trust": "विश्वास",
    "Coordinating Ride": "सवारी समन्वय",
    "Secure Chat Started": "सुरक्षित चैट शुरू हुई",
    "Write a message to ": "को संदेश लिखें...",
    " Messages are secured by KarmaRide Community Trust": " संदेश कर्मा-राइड कम्युनिटी ट्रस्ट द्वारा सुरक्षित हैं",
    "Back to Dashboard": "डैशबोर्ड पर वापस जाएं",
    "Help the community by reporting roadblocks, construction, or hazards.": "रुकावटों, निर्माण या खतरों की रिपोर्ट करके समुदाय की सहायता करें।",
    "Location (e.g. Village Name, Landmark)": "स्थान (जैसे गांव का नाम, मील का पत्थर)",
    "e.g. Main road near Bhatwari": "जैसे भटवाड़ी के पास मुख्य सड़क",
    "Details of the issue": "समस्या का विवरण",
    "Describe the roadblock or condition...": "रुकावट या स्थिति का वर्णन करें...",
    "Attach Photographic Proof (Optional)": "फोटोग्राफिक प्रमाण संलग्न करें (वैकल्पिक)",
    " Change Image": " छवि बदलें",
    "Click to upload": "अपलोड करने के लिए क्लिक करें",
    " or take a photo": " या एक फोटो लें",
    "Broadcast to Village": "गांव में प्रसारित करें"
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

chat_replacements = [
    ("}} Trust", "}} {{ t('Trust') }}"),
    (">Coordinating Ride</div>", ">{{ t('Coordinating Ride') }}</div>"),
    (">Secure Chat Started</span>", ">{{ t('Secure Chat Started') }}</span>"),
    ('placeholder="Write a message to {{ otherPerson.name }}..."', 'placeholder="{{ t(\'Write a message to \') }}{{ otherPerson.name }}..."'),
    (" Messages are secured by KarmaRide Community Trust\n                    </span>", "{{ t(' Messages are secured by KarmaRide Community Trust') }}\n                    </span>")
]

report_replacements = [
    (">Back to Dashboard</span>", ">{{ t('Back to Dashboard') }}</span>"),
    (">Help the community by reporting roadblocks, construction, or hazards.</p>", ">{{ t('Help the community by reporting roadblocks, construction, or hazards.') }}</p>"),
    (">Location (e.g. Village Name, Landmark)</label>", ">{{ t('Location (e.g. Village Name, Landmark)') }}</label>"),
    ('placeholder="e.g. Main road near Bhatwari"', 'placeholder="{{ t(\'e.g. Main road near Bhatwari\') }}"'),
    (">Details of the issue</label>", ">{{ t('Details of the issue') }}</label>"),
    ('placeholder="Describe the roadblock or condition..."', 'placeholder="{{ t(\'Describe the roadblock or condition...\') }}"'),
    (">Attach Photographic Proof (Optional)</label>", ">{{ t('Attach Photographic Proof (Optional)') }}</label>"),
    (" Change Image\n                                    </span>", "{{ t(' Change Image') }}\n                                    </span>"),
    (">Click to upload</span>", ">{{ t('Click to upload') }}</span>"),
    (" or take a photo</p>", "{{ t(' or take a photo') }}</p>"),
    ("Broadcast to Village\n                    </button>", "{{ t('Broadcast to Village') }}\n                    </button>")
]

def apply_replacements(filename, rep_list):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in rep_list:
        content = content.replace(old, new)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

apply_replacements('templates/chat.html', chat_replacements)
apply_replacements('templates/report_road.html', report_replacements)

print("Done translating chat and report_road")
