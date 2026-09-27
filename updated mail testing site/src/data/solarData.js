// High-definition, verified solar photos and CAD visualization assets
export const IMAGES = {
  // Real high-resolution equipment photos
  solarPanel: "https://images.unsplash.com/photo-1545208942-e1c9c916524b?auto=format&fit=crop&w=800&q=80",
  solarInverter: "https://images.unsplash.com/photo-1558442074-3c19857bc1dc?auto=format&fit=crop&w=800&q=80",
  batteryVault: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80",
  batteryWall: "https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?auto=format&fit=crop&w=800&q=80",
  solarRacking: "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=800&q=80",
  
  // Real CAD & Project Blueprints
  cadResidential: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=1000&q=80",
  cadCommercial: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=80",
  cadElectricalSLD: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80",
  cadShading3D: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80",
  cadSolarField: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1000&q=80",

  // Team Member Professional Photos
  headEngineer: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
  ashishDesigner: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  priyaEngineer: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  marcusElectrician: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  ananyaData: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",

  // Hero background
  heroBg: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1600&q=80"
};

// Central currency config — change `code`/`symbol`/`locale` in one place
// to re-price the entire site (catalog + calculator).
export const CURRENCY = {
  code: "USD",
  symbol: "$",
  locale: "en-US",
  format: (amount) =>
    CURRENCY.symbol + Math.round(amount).toLocaleString(CURRENCY.locale),
};

// Engineering assumptions used by the sizing calculator.
// Values are expressed in the active CURRENCY (see CURRENCY above).
export const SOLAR_ASSUMPTIONS = {
  tariffPerKwh: 0.22, // average retail electricity tariff per kWh
  monthlyGenPerKw: 125, // kWh generated per installed kW per month
  sqFtPerKwHome: 100, // usable rooftop area per kW (residential, spaced layout)
  sqFtPerKwBuilding: 90, // usable rooftop area per kW (commercial, ballasted tilt)
  equipmentCostPerKwHome: 1100, // all-in panels + inverter per kW
  equipmentCostPerKwBuilding: 950,
  batteryCostHome: 3800, // 15.2 kWh residential vault
  batteryCostBuilding: 12500, // 50 kWh commercial bank
  designFee: 450, // custom CAD + engineering review
  installFeePct: 0.18, // installation & grid interconnection (% of equipment)
};

export const COMPANY_INFO = {
  name: "Grid Master",
  tagline: "Precision Solar Engineering, 3D Array Design & Seamless Grid Integration",
  description: "Grid Master delivers end-to-end solar solutions for residential homes and commercial complexes. From customized CAD blueprints and yield simulations to turn-key installation and high-voltage grid interconnection.",
  founded: "2018",
  projectsCompleted: "1,250+",
  totalMegawatts: "380+ MW",
  customerSatisfaction: "99.4%",
  phone: "+91 7200745180",
  phoneDisplay: "+91 72007 45180",
  directPhone: "+91 7200745180",
  email: "contactgridmaster@gmail.com",
  address: "Solar Tech Park, Suite 402, Clean Energy Corridor, Hyderabad / Global HQ",
};

export const TEAM_MEMBERS = [
  {
    id: "g-gowtham",
    name: "GANDHAMANENI GOUTHAM",
    shortName: "G. GOUTHAM",
    title: "Head Engineer — Solar Designing & Electrical Engineering",
    role: "Head Engineer",
    badge: "Head Engineer & Director",
    specialization: "Solar Designing Engineer & Electrical Engineer",
    experience: "12+ Years",
    credentials: "M.Tech Electrical Engineering, NABCEP Solar Master, IEEE Member",
    bio: "Chief Architect behind Grid Master's solar design standards. GANDHAMANENI GOUTHAM leads all high-capacity commercial grid integrations, structural load simulations, and electrical safety validations.",
    projects: "450+ Projects Lead",
    email: "contactgridmaster@gmail.com",
    phone: "+91 7200745180",
    avatar: IMAGES.headEngineer,
    initials: "GG",
    isHead: true,
    skills: ["Solar CAD Design", "Grid Interconnection", "PVsyst Simulation", "High Voltage Safety", "BIPV Architecture", "Load Flow Analysis"]
  },
  {
    id: "ashish",
    name: "Ashish Kumar",
    shortName: "Ashish Kumar",
    title: "Solar Designer Engineer",
    role: "Senior Solar Designer Engineer",
    badge: "Solar Designer Specialist",
    specialization: "Rooftop Layouts, 3D Shading & CAD Schematics",
    experience: "7+ Years",
    credentials: "B.Tech Electrical & Electronics, Certified PVsyst Modeler",
    bio: "Ashish Kumar specializes in precision 3D solar layout modeling, string inverter calculations, dynamic shading analysis, and single-line diagram (SLD) creation for homes and commercial buildings.",
    projects: "280+ Designs Created",
    email: "snazzy5566@gmail.com",
    phone: "+91 7200745181",
    avatar: IMAGES.ashishDesigner,
    initials: "AK",
    isHead: false,
    skills: ["3D Roof Modeling", "Single Line Diagrams", "String Sizing", "HelioScope", "AutoCAD Electrical", "Shading Analysis"]
  },
  {
    id: "priya",
    name: "Priya Sharma",
    shortName: "P. Sharma",
    title: "Grid Integration Specialist",
    role: "Lead Power Systems Engineer",
    badge: "Storage & Grid Lead",
    specialization: "Smart Grid Integration & Energy Storage Systems",
    experience: "6+ Years",
    credentials: "M.S. Energy Systems Engineering",
    bio: "Priya focuses on hybrid battery integration, microgrid controls, and remote telemetry monitoring systems for seamless residential and commercial solar adoption.",
    projects: "190+ Integrations",
    email: "contactgridmaster@gmail.com",
    phone: "+91 7200745182",
    avatar: IMAGES.priyaEngineer,
    initials: "PS",
    isHead: false,
    skills: ["Battery Management Systems", "Microgrid Controls", "SCADA Integration", "Energy Auditing"]
  },
  {
    id: "marcus",
    name: "Marcus Vance",
    shortName: "M. Vance",
    title: "Senior Installation Manager",
    role: "Field Engineering Director",
    badge: "Field Operations Director",
    specialization: "Structural Racking, Inverter Commissioning & On-Site Safety",
    experience: "9+ Years",
    credentials: "Licensed Master Electrician, OSHA 30",
    bio: "Marcus directs field engineering teams, ensuring flawless hardware installation, mounting durability against wind loads, and national electric code compliance.",
    projects: "340+ Installations",
    email: "contactgridmaster@gmail.com",
    avatar: IMAGES.marcusElectrician,
    initials: "MV",
    isHead: false,
    skills: ["On-site Commissioning", "Structural Load Testing", "Transformer Hookup", "NEC Code Audit"]
  },
  {
    id: "ananya",
    name: "Ananya Patel",
    shortName: "A. Patel",
    title: "Solar Yield & Financial Analyst",
    role: "Energy Yield Optimization Engineer",
    badge: "ROI & Yield Analyst",
    specialization: "Photovoltaic Performance Forecasting & Economic ROI Modeling",
    experience: "5+ Years",
    credentials: "B.E. Electrical Engineering, Data Analytics Certified",
    bio: "Ananya builds financial ROI forecasts, degradation models, and custom generation curves so clients can maximize energy independence and grid feed-in tariffs.",
    projects: "210+ Yield Analytics",
    email: "contactgridmaster@gmail.com",
    phone: "+91 7200745184",
    avatar: IMAGES.ananyaData,
    initials: "AP",
    isHead: false,
    skills: ["Yield Forecasting", "Tariff Calculations", "Financial Modeling", "Degradation Analysis"]
  }
];

export const EQUIPMENT_CATALOG = [
  {
    id: "eq-panel-550",
    name: "Grid Master UltraPro N-Type TOPCon Solar Module",
    category: "Solar Panels",
    type: "Monocrystalline N-Type TOPCon",
    wattage: "550W",
    efficiency: "22.8% Glass-Glass Bifacial",
    warranty: "30-Year Performance / 25-Year Product Warranty",
    pricePerUnit: 185,
    unit: "per panel",
    image: IMAGES.solarPanel,
    badge: "Top Efficiency 2026",
    specs: [
      "Half-Cut Cell Architecture for Shading Tolerance",
      "Bifacial Energy Yield Gain (+25% Rear side reflectivity)",
      "PID / LID Resistance with IP68 Waterproof Junction Box",
      "Anti-Reflective Hydrophobic Self-Cleaning Glass"
    ]
  },
  {
    id: "eq-inverter-10k",
    name: "Grid Master Smart Hybrid Inverter (10kW Three-Phase)",
    category: "Inverters",
    type: "Smart Hybrid On/Off-Grid Inverter",
    wattage: "10 kW AC / 15 kW DC Input",
    efficiency: "98.6% European Efficiency",
    warranty: "10-Year Comprehensive Warranty",
    pricePerUnit: 1450,
    unit: "per unit",
    image: IMAGES.solarInverter,
    badge: "Smart Grid Sync",
    specs: [
      "Dual MPPT Trackers for Dynamic Roof Orientations",
      "Sub-10ms Seamless Battery Backup Transfer",
      "Built-in WiFi, Ethernet & Mobile App Telemetry",
      "Integrated Arc Fault Circuit Interrupter (AFCI)"
    ]
  },
  {
    id: "eq-battery-15k",
    name: "Grid Master PowerVault LiFePO4 Battery Wall (15.2 kWh)",
    category: "Battery Storage",
    type: "Lithium Iron Phosphate (LiFePO4) Modular Storage",
    wattage: "15.2 kWh Energy / 7.6 kW Continuous Output",
    efficiency: "96.5% Round-Trip Efficiency",
    warranty: "10-Year Unlimited Cycle Warranty (6,000+ Cycles)",
    pricePerUnit: 2850,
    unit: "per vault",
    image: IMAGES.batteryVault,
    badge: "Zero Cobalt Safety",
    specs: [
      "Non-Toxic Zero Cobalt Chemistry (Fire-Proof Safety)",
      "Scalable up to 121.6 kWh (8 Vault Stackable)",
      "Built-in Smart BMS with Thermal Active Balancing",
      "Wall-Mounted Sleek IP65 All-Weather Casing"
    ]
  },
  {
    id: "eq-racking-dual",
    name: "Grid Master Heavy-Duty Dual-Axis Tracker & Ballasted Racking",
    category: "Racking & Mounting",
    type: "Marine-Grade Anodized Aluminum Racking",
    wattage: "Supports 10kW to 500kW Arrays",
    efficiency: "+35% Energy Boost vs Fixed Flat Roof",
    warranty: "25-Year Structural Integrity Guarantee",
    pricePerUnit: 620,
    unit: "per 5kW set",
    image: IMAGES.solarRacking,
    badge: "180 MPH Wind Rated",
    specs: [
      "GPS Astronomical Solar Tracking Sensor",
      "180 MPH Hurricane-Proof Wind Load Certified",
      "Zero Roof Penetration Concrete Ballast Option for Commercial Buildings",
      "Stainless Steel Hardware & Anti-Corrosion Coating"
    ]
  }
];

export const CAD_DESIGN_SAMPLES = [
  {
    id: "sample-1",
    title: "12 kW Villa Rooftop Solar & Hybrid Battery Blueprint",
    type: "Residential (Home)",
    client: "Luxury Residence Project, Hyderabad",
    capacity: "12 kW DC",
    panels: "22x TOPCon 550W Panels",
    inverter: "10 kW Hybrid Smart Inverter",
    storage: "15.2 kWh PowerVault Battery",
    estGeneration: "18,400 kWh / Year",
    co2Saved: "14.2 Tons / Year",
    leadDesigner: "Ashish Kumar (Solar Designer Engineer)",
    coDesigner: "GANDHAMANENI GOUTHAM (Head Engineer)",
    image: IMAGES.cadResidential,
    description: "Tailored 3D rooftop design for a multi-story villa. Engineered to avoid shadow obstruction from water tanks and AC outdoor units while preserving aesthetic roof geometry.",
    features: [
      "Custom 3D Shadow Simulation (HelioScope)",
      "Hidden Conduit Electrical Routing Layout",
      "Zero Bill Optimization with Net-Metering Interconnection",
      "Approved and Certified by Head Engineer GANDHAMANENI GOUTHAM"
    ],
    technicalDetails: {
      roofPitch: "12° Slope Concrete Roof",
      azimuth: "175° South-South-East",
      stringConfiguration: "2 Strings of 11 Panels",
      mpptEfficiency: "99.1%",
      estimatedPayback: "3.1 Years"
    }
  },
  {
    id: "sample-2",
    title: "250 kW Industrial Commercial Rooftop Solar Layout",
    type: "Commercial (Building)",
    client: "Apex Commercial Tech Park, Hyderabad",
    capacity: "250 kW DC",
    panels: "455x UltraPro 550W Panels",
    inverter: "2x 100kW Industrial String Inverters",
    storage: "Optional Commercial Battery Prepared",
    estGeneration: "375,000 kWh / Year",
    co2Saved: "290 Tons / Year",
    leadDesigner: "GANDHAMANENI GOUTHAM (Head Engineer)",
    coDesigner: "Ashish Kumar (Solar Designer Engineer)",
    image: IMAGES.cadCommercial,
    description: "High-capacity commercial building rooftop design with non-penetrative ballasted racking, transformer step-up integration, and rapid shutdown safety controls.",
    features: [
      "Structural Dead Load & Wind Speed Load Modeling",
      "Step-Up Transformer & High Voltage Disconnect Integration",
      "Peak Demand Shaving & Time-of-Use Tariff Controller",
      "Designed for Commercial & Industrial Utility Standards"
    ],
    technicalDetails: {
      roofPitch: "Flat Membrane Roof (5° Ballasted Tilt)",
      azimuth: "180° True South Alignment",
      stringConfiguration: "26 Strings in Parallel",
      mpptEfficiency: "99.4%",
      estimatedPayback: "2.4 Years"
    }
  },
  {
    id: "sample-3",
    title: "Single Line Electrical Diagram (SLD) & Protection Blueprint",
    type: "Electrical Schematic",
    client: "Grid Master Engineering Standard SLD",
    capacity: "Standard 10kW to 100kW Systems",
    panels: "Multi-String Array Configurations",
    inverter: "Grid-Tied / Hybrid Isolated Systems",
    storage: "DC/AC Coupled Storage Bus",
    estGeneration: "Optimized Circuit Efficiency",
    co2Saved: "IEEE Electrical Standard",
    leadDesigner: "GANDHAMANENI GOUTHAM (Head Engineer & Electrical Engineer)",
    coDesigner: "Ashish Kumar (Solar Designer Engineer)",
    image: IMAGES.cadElectricalSLD,
    description: "Detailed single line electrical diagram showing DC isolators, SPD surge protection devices, AC distribution boards, bi-directional net-metering, and safety grounding earthing pits.",
    features: [
      "NEC 2023 & State Electricity Code Compliance",
      "Dual DC Surge Protection (Class II SPD)",
      "Bi-Directional Utility Disconnect Meter Schematic",
      "Certified Electrical Safety Stamp by GANDHAMANENI GOUTHAM"
    ],
    technicalDetails: {
      voltageLevel: "415V 3-Phase AC / 1000V DC String",
      protectionRating: "IP65 Weatherproof Isolators",
      earthingType: "Dual Copper Bonded Pits",
      mpptEfficiency: "99.2%",
      estimatedPayback: "2.7 Years"
    }
  },
  {
    id: "sample-4",
    title: "8.5 kW Eco-Home Off-Grid Solar & Battery Microgrid Design",
    type: "Residential (Home)",
    client: "Green Valley Off-Grid Eco-Home",
    capacity: "8.5 kW DC",
    panels: "16x AeroUltra 535W Panels",
    inverter: "8kW Off-Grid Pure Sine Wave Inverter",
    storage: "30.4 kWh Dual PowerVault Battery",
    estGeneration: "12,800 kWh / Year",
    co2Saved: "9.1 Tons / Year",
    leadDesigner: "Ashish Kumar (Solar Designer Engineer)",
    coDesigner: "GANDHAMANENI GOUTHAM (Head Engineer)",
    image: IMAGES.cadShading3D,
    description: "Self-sustaining off-grid solar layout designed for rural or remote homes. Features dual battery redundancy, automatic generator backup starting, and surge protection.",
    features: [
      "100% Utility Independence Architecture",
      "Automatic Generator Start (AGS) Contingency Relay",
      "Smart Load Priority Controller for HVAC & Appliances",
      "Designed by Ashish Kumar, Peer Reviewed by GANDHAMANENI GOUTHAM"
    ],
    technicalDetails: {
      roofPitch: "35° Pitched Metal Roof",
      azimuth: "180° True South",
      stringConfiguration: "2 Strings of 8 Panels",
      mpptEfficiency: "98.5%",
      estimatedPayback: "4.2 Years"
    }
  }
];

export const SERVICES_LIST = [
  {
    id: "srv-1",
    title: "Solar System Designing & 3D Simulation",
    subtitle: "Custom CAD Layouts, PVsyst & Shading Simulations",
    icon: "DraftingCompass",
    forHome: true,
    forBuilding: true,
    description: "Our engineering team, led by GANDHAMANENI GOUTHAM and Ashish Kumar, crafts tailored 3D roof layouts, single line diagrams (SLD), and shade impact reports before a single bolt is turned.",
    highlights: ["Detailed CAD Electrical Blueprints", "PVsyst Year-Round Production Yield", "Structural Roof Weight & Wind Load Checks", "3D Photorealistic Client Renderings"]
  },
  {
    id: "srv-2",
    title: "Turn-Key Solar Installation",
    subtitle: "Precision Hardware Mounting & Inverter Setup",
    icon: "Wrench",
    forHome: true,
    forBuilding: true,
    description: "Certified field engineers install marine-grade aluminum racking, high-efficiency solar modules, and smart inverter systems with zero compromise on safety or roof integrity.",
    highlights: ["Licensed Master Electricians", "Weatherproof Penetrations & Seals", "Rapid Shutdown Safety Mechanism", "Full System Grounding & Surge Arresters"]
  },
  {
    id: "srv-3",
    title: "High-Voltage Grid Integration & Net Metering",
    subtitle: "Utility Disconnect, Bi-directional Meters & SCADA",
    icon: "Zap",
    forHome: true,
    forBuilding: true,
    description: "Complete utility approval handling, grid synchronization, bi-directional net-metering commissioning, and remote SCADA monitoring configuration.",
    highlights: ["State Utility Disconnect Approval", "Bi-Directional Meter Setup", "Zero-Export Control Systems", "Smart Phone Real-Time Telemetry App"]
  },
  {
    id: "srv-4",
    title: "Battery Storage & Microgrid Integration",
    subtitle: "LiFePO4 Power Vaults, Peak Shaving & Outage Shield",
    icon: "BatteryCharging",
    forHome: true,
    forBuilding: true,
    description: "Integrate high-performance lithium batteries to store daytime solar surplus for night consumption or uninterrupted emergency blackout protection.",
    highlights: ["Sub-10ms Auto Transfer Switching", "Smart Peak-Shaving Tariff Saver", "Scalable Modular Capacity (15kWh to 500kWh)", "Thermal Management & Fire Suppression"]
  },
  {
    id: "srv-5",
    title: "Commercial Building BIPV & Facade Engineering",
    subtitle: "Building Integrated Photovoltaics & Canopy Structures",
    icon: "Building2",
    forHome: false,
    forBuilding: true,
    description: "Architectural solar integration for glass facades, parking lot solar carports, and rooftop gardens engineered for modern green building standards (LEED/IGBC).",
    highlights: ["Architectural Solar Glass Integration", "Solar Carport & EV Charger Hubs", "LEED Clean Energy Points Boost", "Custom Structural Steel Subframes"]
  }
];

export const TESTIMONIALS = [
  {
    id: "test-1",
    name: "Dr. Rajeshwar Rao",
    role: "Homeowner, Luxury Villa (15 kW System)",
    comment: "GANDHAMANENI GOUTHAM and the Grid Master team delivered an incredible 3D design blueprint for our villa. The solar panel alignment looks sleek, and our monthly electricity bill dropped from ₹35,000 to nearly ZERO! Ashish Kumar's single line schematic made utility approval seamless.",
    rating: 5,
    systemSize: "15 kW Hybrid + 15kWh Battery",
    location: "Jubilee Hills, Hyderabad"
  },
  {
    id: "test-2",
    name: "Vikramaditya Verma",
    role: "Managing Director, Apex Logistics Park",
    comment: "For our 500 kW commercial building array, Head Engineer GANDHAMANENI GOUTHAM conducted rigorous structural load tests and grid interconnection planning. Grid Master executed the entire installation in record time with zero downtime for our warehouse operations.",
    rating: 5,
    systemSize: "500 kW Commercial Grid-Tied",
    location: "Gachibowli Tech Zone"
  },
  {
    id: "test-3",
    name: "Meera Subramanian",
    role: "Facility Manager, Horizon Office Towers",
    comment: "The equipment pricing transparency at Grid Master is top tier. We reviewed their equipment catalog, customized our inverters with Ashish Kumar, and booked our commercial integration online. Outstanding engineering standard!",
    rating: 5,
    systemSize: "220 kW Rooftop Array",
    location: "HITEC City"
  }
];

export const FAQS = [
  {
    q: "How does Grid Master design custom solar systems for homes vs buildings?",
    a: "Our Head Engineer GANDHAMANENI GOUTHAM and Senior Solar Designer Ashish Kumar create 3D CAD models using satellite roof geometry, local sun trajectory, and electrical load profiles. For homes, we focus on aesthetic alignment, silent battery backups, and 100% bill reduction. For commercial buildings, we engineer structural ballasted racking, high-voltage transformer connections, and peak-shaving economic models."
  },
  {
    q: "Can I choose my preferred solar panels, inverters, and batteries?",
    a: "Yes! Grid Master features an open equipment catalog with transparent pricing for top-rated TOPCon panels, hybrid inverters, and LiFePO4 batteries. You can select specific hardware during our online booking process or let GANDHAMANENI GOUTHAM recommend the ideal configuration for your energy requirements."
  },
  {
    q: "Who conducts the initial site inspection and electrical engineering audit?",
    a: "All solar designs and single line electrical schematics are reviewed and certified directly under the supervision of GANDHAMANENI GOUTHAM, our Head Engineer (Solar Designing & Electrical Engineering), along with Ashish Kumar and our senior engineering roster."
  },
  {
    q: "How long does the installation and grid integration process take?",
    a: "Residential home installations typically take 2 to 4 days on-site following design approval. Commercial building integrations range from 2 to 3 weeks depending on utility net-metering approvals and transformer hookups."
  },
  {
    q: "What warranties and guarantees does Grid Master provide?",
    a: "We offer a 25 to 30 year performance warranty on solar panels, 10 to 12 years on smart hybrid inverters, 10 years on lithium battery banks, and a 10-year Grid Master Guarantee on all installation workmanship and roof waterproofing."
  }
];
