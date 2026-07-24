import json
import os

translations = {
    "KarmaRide Admin": "कर्मा-राइड एडमिन",
    "Community Management": "सामुदायिक प्रबंधन",
    "Dashboard": "डैशबोर्ड",
    "Members": "सदस्य",
    "Return to App": "ऐप पर लौटें",
    "New Announcement": "नई घोषणा",
    "KarmaRide Console": "कर्मा-राइड कंसोल",
    "Search...": "खोजें...",
    "Village Chaupal Overview": "ग्राम चौपाल अवलोकन",
    "Real-time metrics and community activity monitoring.": "वास्तविक समय मेट्रिक्स और सामुदायिक गतिविधि की निगरानी।",
    "Export Report": "रिपोर्ट निर्यात करें",
    "Total Good Karma": "कुल अच्छा कर्म",
    "Total across platform": "प्लेटफ़ॉर्म पर कुल",
    "Active Rides": "सक्रिय सवारी",
    "Currently En Route": "वर्तमान में रास्ते में",
    "Verified Members": "सत्यापित सदस्य",
    "Community Size": "समुदाय का आकार",
    "Drivers Approved": "ड्राइवर स्वीकृत",
    "Fully Vetted": "पूरी तरह से जांचा गया",
    "Total Trips": "कुल यात्राएं",
    "All time": "हर समय",
    "Total Complaints": "कुल शिकायतें",
    "Logged Issues": "लॉग की गई समस्याएं",
    "Activity Trends": "गतिविधि रुझान",
    "Karma activity over the last 7 days": "पिछले 7 दिनों में कर्म गतिविधि",
    "Last 7 Days": "पिछले 7 दिन",
    "Last 30 Days": "पिछले 30 दिन",
    "Recent Alerts": "हालिया अलर्ट",
    "View All": "सभी देखें",
    "Ride request: ": "सवारी का अनुरोध: ",
    "From ": "से ",
    "No recent alerts.": "कोई हालिया अलर्ट नहीं।",
    "Recent Transactions": "हाल के लेनदेन",
    "Filter": "फ़िल्टर",
    "Name": "नाम",
    "Karma": "कर्म",
    "Method": "तरीका",
    "Status": "स्थिति",
    "Action": "कार्रवाई",
    "Karma Transfer": "कर्म स्थानांतरण",
    "No transactions yet.": "अभी तक कोई लेनदेन नहीं।",
    "Members Directory": "सदस्य निर्देशिका",
    "Manage users, track karma, and oversee trust ratings across the platform.": "उपयोगकर्ताओं को प्रबंधित करें, कर्म ट्रैक करें, और प्लेटफ़ॉर्म भर में विश्वास रेटिंग की निगरानी करें।",
    "Add Member": "सदस्य जोड़ें",
    "Total Members": "कुल सदस्य",
    "Growth steady": "स्थिर विकास",
    "Active Drivers": "सक्रिय ड्राइवर",
    "Karma Circulation": "कर्म संचलन",
    "Healthy liquidity pool": "स्वस्थ तरलता पूल",
    "Avg Trust Rating": "औसत विश्वास रेटिंग",
    "Based on historical rides": "ऐतिहासिक सवारी के आधार पर",
    "Search members by name or email...": "नाम या ईमेल द्वारा सदस्यों को खोजें...",
    "Member": "सदस्य",
    "Email": "ईमेल",
    "Karma Balance": "कर्म शेष",
    "Trust Rating": "विश्वास रेटिंग",
    "Joined Date": "शामिल होने की तिथि",
    "Actions": "कार्रवाइयां",
    "Showing 1 to ": "दिखा रहा है 1 से ",
    " of ": " में से ",
    " members": " सदस्य",
    "Create New Announcement": "नई घोषणा बनाएं",
    "Announcement Title": "घोषणा का शीर्षक",
    "Enter title here": "यहां शीर्षक दर्ज करें",
    "Target Audience": "लक्षित दर्शक",
    "All Users": "सभी उपयोगकर्ता",
    "Active Drivers Only": "केवल सक्रिय ड्राइवर",
    "Riders Only": "केवल सवारी",
    "Message Body": "संदेश मुख्य भाग",
    "Type your message here...": "अपना संदेश यहां टाइप करें...",
    "Send Push Notification": "पुश अधिसूचना भेजें",
    "Notify users immediately on their devices.": "उपयोगकर्ताओं को उनके उपकरणों पर तुरंत सूचित करें।",
    "Publish Announcement": "घोषणा प्रकाशित करें",
    "Cancel": "रद्द करें",
    "Announcement successfully broadcasted to the community.": "समुदाय में घोषणा सफलतापूर्वक प्रसारित की गई।",
    "Back to Dashboard": "डैशबोर्ड पर वापस जाएं",
    "Admin": "एडमिन"
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

admin_replacements = [
    (">KarmaRide Admin</h1>", ">{{ t('KarmaRide Admin') }}</h1>"),
    (">Community Management</p>", ">{{ t('Community Management') }}</p>"),
    (">Dashboard</span>", ">{{ t('Dashboard') }}</span>"),
    (">Members</span>", ">{{ t('Members') }}</span>"),
    (">Return to App</span>", ">{{ t('Return to App') }}</span>"),
    (">New Announcement</a>", ">{{ t('New Announcement') }}</a>"),
    ("KarmaRide Console\n            </div>", "{{ t('KarmaRide Console') }}\n            </div>"),
    ('placeholder="Search..."', 'placeholder="{{ t(\'Search...\') }}"'),
    (">Admin</span>", ">{{ t('Admin') }}</span>"),
    (">Village Chaupal Overview</h2>", ">{{ t('Village Chaupal Overview') }}</h2>"),
    (">Real-time metrics and community activity monitoring.</p>", ">{{ t('Real-time metrics and community activity monitoring.') }}</p>"),
    ("Export Report\n                        </button>", "{{ t('Export Report') }}\n                        </button>"),
    (">Total Good Karma</span>", ">{{ t('Total Good Karma') }}</span>"),
    (" Total across platform\n                            </div>", " {{ t('Total across platform') }}\n                            </div>"),
    (">Active Rides</span>", ">{{ t('Active Rides') }}</span>"),
    ("                                Currently En Route\n                            </div>", "                                {{ t('Currently En Route') }}\n                            </div>"),
    (">Verified Members</span>", ">{{ t('Verified Members') }}</span>"),
    ("                                Community Size\n                            </div>", "                                {{ t('Community Size') }}\n                            </div>"),
    (">Drivers Approved</span>", ">{{ t('Drivers Approved') }}</span>"),
    ("                                Fully Vetted\n                            </div>", "                                {{ t('Fully Vetted') }}\n                            </div>"),
    (">Total Trips</span>", ">{{ t('Total Trips') }}</span>"),
    ("                                All time\n                            </div>", "                                {{ t('All time') }}\n                            </div>"),
    (">Total Complaints</span>", ">{{ t('Total Complaints') }}</span>"),
    (" Logged Issues\n                            </div>", " {{ t('Logged Issues') }}\n                            </div>"),
    (">Activity Trends</h3>", ">{{ t('Activity Trends') }}</h3>"),
    (">Karma activity over the last 7 days</p>", ">{{ t('Karma activity over the last 7 days') }}</p>"),
    (">Last 7 Days</option>", ">{{ t('Last 7 Days') }}</option>"),
    (">Last 30 Days</option>", ">{{ t('Last 30 Days') }}</option>"),
    (">Recent Alerts</h3>", ">{{ t('Recent Alerts') }}</h3>"),
    (">View All</button>", ">{{ t('View All') }}</button>"),
    ("Ride request: ", "{{ t('Ride request: ') }}"),
    ("• From ", "• {{ t('From ') }}"),
    (">No recent alerts.</p>", ">{{ t('No recent alerts.') }}</p>"),
    (">Recent Transactions</h3>", ">{{ t('Recent Transactions') }}</h3>"),
    (" Filter\n                            </button>", " {{ t('Filter') }}\n                            </button>"),
    (">Name</th>", ">{{ t('Name') }}</th>"),
    (">Karma</th>", ">{{ t('Karma') }}</th>"),
    (">Method</th>", ">{{ t('Method') }}</th>"),
    (">Status</th>", ">{{ t('Status') }}</th>"),
    (">Action</th>", ">{{ t('Action') }}</th>"),
    ("No transactions yet.", "{{ t('No transactions yet.') }}")
]

members_replacements = [
    (">KarmaRide Admin</h1>", ">{{ t('KarmaRide Admin') }}</h1>"),
    (">Community Management</p>", ">{{ t('Community Management') }}</p>"),
    (">Dashboard</span>", ">{{ t('Dashboard') }}</span>"),
    (">Members</span>", ">{{ t('Members') }}</span>"),
    (">Return to App</span>", ">{{ t('Return to App') }}</span>"),
    ("KarmaRide Console</div>", "{{ t('KarmaRide Console') }}</div>"),
    (">Admin</span>", ">{{ t('Admin') }}</span>"),
    (">Members Directory</h2>", ">{{ t('Members Directory') }}</h2>"),
    (">Manage users, track karma, and oversee trust ratings across the platform.</p>", ">{{ t('Manage users, track karma, and oversee trust ratings across the platform.') }}</p>"),
    ("            Add Member\n        </button>", "            {{ t('Add Member') }}\n        </button>"),
    (">Total Members</h3>", ">{{ t('Total Members') }}</h3>"),
    (" Growth steady\n            </div>", " {{ t('Growth steady') }}\n            </div>"),
    (">Active Drivers</h3>", ">{{ t('Active Drivers') }}</h3>"),
    (" Fully Vetted\n            </div>", " {{ t('Fully Vetted') }}\n            </div>"),
    (">Karma Circulation</h3>", ">{{ t('Karma Circulation') }}</h3>"),
    ("                Healthy liquidity pool\n            </div>", "                {{ t('Healthy liquidity pool') }}\n            </div>"),
    (">Avg Trust Rating</h3>", ">{{ t('Avg Trust Rating') }}</h3>"),
    ("                Based on historical rides\n            </div>", "                {{ t('Based on historical rides') }}\n            </div>"),
    ('placeholder="Search members by name or email..."', 'placeholder="{{ t(\'Search members by name or email...\') }}"'),
    (">Member</th>", ">{{ t('Member') }}</th>"),
    (">Email</th>", ">{{ t('Email') }}</th>"),
    (">Karma Balance</th>", ">{{ t('Karma Balance') }}</th>"),
    (">Trust Rating</th>", ">{{ t('Trust Rating') }}</th>"),
    (">Joined Date</th>", ">{{ t('Joined Date') }}</th>"),
    (">Actions</th>", ">{{ t('Actions') }}</th>"),
    (">Member</div>", ">{{ t('Member') }}</div>"),
    ("                Showing 1 to ", "                {{ t('Showing 1 to ') }}"),
    (" of ", " {{ t(' of ') }}"),
    (" members\n            </div>", " {{ t(' members') }}\n            </div>")
]

announcement_replacements = [
    (">KarmaRide Admin</h1>", ">{{ t('KarmaRide Admin') }}</h1>"),
    (">Community Management</p>", ">{{ t('Community Management') }}</p>"),
    (">Dashboard</span>", ">{{ t('Dashboard') }}</span>"),
    (">Members</span>", ">{{ t('Members') }}</span>"),
    (">Return to App</span>", ">{{ t('Return to App') }}</span>"),
    ("KarmaRide Console</div>", "{{ t('KarmaRide Console') }}</div>"),
    (">Admin</span>", ">{{ t('Admin') }}</span>"),
    ("            Back to Dashboard\n        </a>", "            {{ t('Back to Dashboard') }}\n        </a>"),
    (">Create New Announcement</h1>", ">{{ t('Create New Announcement') }}</h1>"),
    (">Announcement successfully broadcasted to the community.</p>", ">{{ t('Announcement successfully broadcasted to the community.') }}</p>"),
    (">Announcement Title</label>", ">{{ t('Announcement Title') }}</label>"),
    ('placeholder="Enter title here"', 'placeholder="{{ t(\'Enter title here\') }}"'),
    (">Target Audience</label>", ">{{ t('Target Audience') }}</label>"),
    (">All Users</option>", ">{{ t('All Users') }}</option>"),
    (">Active Drivers Only</option>", ">{{ t('Active Drivers Only') }}</option>"),
    (">Riders Only</option>", ">{{ t('Riders Only') }}</option>"),
    (">Message Body</label>", ">{{ t('Message Body') }}</label>"),
    ('placeholder="Type your message here..."', 'placeholder="{{ t(\'Type your message here...\') }}"'),
    (">Send Push Notification</div>", ">{{ t('Send Push Notification') }}</div>"),
    (">Notify users immediately on their devices.</div>", ">{{ t('Notify users immediately on their devices.') }}</div>"),
    ("                            Cancel\n</a>", "                            {{ t('Cancel') }}\n</a>"),
    ("                            Publish Announcement\n                        </button>", "                            {{ t('Publish Announcement') }}\n                        </button>")
]

def apply_replacements(filename, rep_list):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in rep_list:
        content = content.replace(old, new)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

apply_replacements('templates/admin.html', admin_replacements)
apply_replacements('templates/admin_members.html', members_replacements)
apply_replacements('templates/admin_announcement_new.html', announcement_replacements)

print("Done translating admin templates")
