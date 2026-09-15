import base64

def make_panel_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#020617"/>
  <rect x="50" y="30" width="500" height="340" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="4"/>
  <!-- Solar Cells Grid -->
  <g fill="#1e293b" stroke="#f59e0b" stroke-width="1.5" opacity="0.9">
    <rect x="70" y="50" width="100" height="90" rx="4"/>
    <rect x="180" y="50" width="100" height="90" rx="4"/>
    <rect x="290" y="50" width="100" height="90" rx="4"/>
    <rect x="400" y="50" width="100" height="90" rx="4"/>
    
    <rect x="70" y="150" width="100" height="90" rx="4"/>
    <rect x="180" y="150" width="100" height="90" rx="4"/>
    <rect x="290" y="150" width="100" height="90" rx="4"/>
    <rect x="400" y="150" width="100" height="90" rx="4"/>
    
    <rect x="70" y="250" width="100" height="90" rx="4"/>
    <rect x="180" y="250" width="100" height="90" rx="4"/>
    <rect x="290" y="250" width="100" height="90" rx="4"/>
    <rect x="400" y="250" width="100" height="90" rx="4"/>
  </g>
  <!-- Busbars -->
  <line x1="50" y1="95" x2="550" y2="95" stroke="#fde047" stroke-width="2"/>
  <line x1="50" y1="195" x2="550" y2="195" stroke="#fde047" stroke-width="2"/>
  <line x1="50" y1="295" x2="550" y2="295" stroke="#fde047" stroke-width="2"/>
  <!-- Badge -->
  <circle cx="510" cy="70" r="22" fill="#f59e0b"/>
  <path d="M510 58 L514 66 L523 67 L516 73 L518 82 L510 77 L502 82 L504 73 L497 67 L506 66 Z" fill="#020617"/>
  <text x="300" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#f59e0b" text-anchor="middle">GRID MASTER HIGH-EFFICIENCY N-TYPE MODULE</text>
</svg>'''
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

def make_inverter_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#020617"/>
  <rect x="120" y="40" width="360" height="320" rx="20" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/>
  <!-- Screen Display -->
  <rect x="160" y="80" width="280" height="100" rx="10" fill="#020617" stroke="#38bdf8" stroke-width="2"/>
  <text x="300" y="120" font-family="monospace" font-size="22" font-weight="bold" fill="#38bdf8" text-anchor="middle">10.00 kW ONLINE</text>
  <text x="300" y="150" font-family="monospace" font-size="14" fill="#10b981" text-anchor="middle">GRID EFFICIENCY: 98.6%</text>
  <!-- LED Indicators -->
  <circle cx="180" cy="220" r="10" fill="#10b981"/>
  <text x="200" y="225" font-family="sans-serif" font-size="12" fill="#e2e8f0">POWER</text>
  <circle cx="280" cy="220" r="10" fill="#f59e0b"/>
  <text x="300" y="225" font-family="sans-serif" font-size="12" fill="#e2e8f0">SOLAR DC</text>
  <circle cx="390" cy="220" r="10" fill="#3b82f6"/>
  <text x="410" y="225" font-family="sans-serif" font-size="12" fill="#e2e8f0">GRID AC</text>
  <!-- Cooling Grill -->
  <g stroke="#334155" stroke-width="3">
    <line x1="180" y1="270" x2="420" y2="270"/>
    <line x1="180" y1="285" x2="420" y2="285"/>
    <line x1="180" y1="300" x2="420" y2="300"/>
    <line x1="180" y1="315" x2="420" y2="315"/>
  </g>
  <text x="300" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="middle">GRID MASTER SMART HYBRID INVERTER</text>
</svg>'''
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

def make_battery_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#020617"/>
  <rect x="140" y="30" width="320" height="340" rx="24" fill="#0f172a" stroke="#10b981" stroke-width="4"/>
  <rect x="230" y="10" width="140" height="20" rx="6" fill="#10b981"/>
  <!-- Status Lights -->
  <rect x="170" y="70" width="260" height="40" rx="8" fill="#020617"/>
  <rect x="180" y="78" width="40" height="24" rx="4" fill="#10b981"/>
  <rect x="230" y="78" width="40" height="24" rx="4" fill="#10b981"/>
  <rect x="280" y="78" width="40" height="24" rx="4" fill="#10b981"/>
  <rect x="330" y="78" width="40" height="24" rx="4" fill="#10b981"/>
  <rect x="380" y="78" width="40" height="24" rx="4" fill="#10b981"/>
  <!-- Power Graphic -->
  <path d="M310 140 L270 230 L310 230 L290 320 L340 210 L300 210 Z" fill="#f59e0b" stroke="#fde047" stroke-width="2"/>
  <text x="300" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#10b981" text-anchor="middle">GRID MASTER POWERVAULT LiFePO4 STORAGE</text>
</svg>'''
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

def make_racking_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#020617"/>
  <!-- Mounting frame structure -->
  <path d="M100 320 L250 120 L480 120 L500 320 Z" fill="#0f172a" stroke="#94a3b8" stroke-width="4"/>
  <line x1="250" y1="120" x2="250" y2="320" stroke="#f59e0b" stroke-width="3"/>
  <line x1="380" y1="120" x2="380" y2="320" stroke="#f59e0b" stroke-width="3"/>
  <!-- Solar panels on rack -->
  <polygon points="230,130 460,130 480,220 220,220" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
  <polygon points="215,230 485,230 505,310 195,310" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
  <text x="300" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#f59e0b" text-anchor="middle">DUAL-AXIS TRACKER & BALLASTED RACKING</text>
</svg>'''
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

def make_cad_svg(title):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <rect width="800" height="500" fill="#020617"/>
  <!-- CAD Grid Lines -->
  <g stroke="#1e293b" stroke-width="1">
    <path d="M0 50 H800 M0 100 H800 M0 150 H800 M0 200 H800 M0 250 H800 M0 300 H800 M0 350 H800 M0 400 H800 M0 450 H800"/>
    <path d="M50 0 V500 M100 0 V500 M150 0 V500 M200 0 V500 M250 0 V500 M300 0 V500 M350 0 V500 M400 0 V500 M450 0 V500 M500 0 V500 M550 0 V500 M600 0 V500 M650 0 V500 M700 0 V500 M750 0 V500"/>
  </g>
  <!-- Roof Outline -->
  <polygon points="150,380 400,120 650,380" fill="none" stroke="#f59e0b" stroke-width="4"/>
  <!-- Panel Strings -->
  <g fill="#0f172a" stroke="#38bdf8" stroke-width="2">
    <rect x="250" y="240" width="60" height="40" rx="2" transform="rotate(-30 280 260)"/>
    <rect x="320" y="200" width="60" height="40" rx="2" transform="rotate(-30 350 220)"/>
    <rect x="390" y="160" width="60" height="40" rx="2" transform="rotate(-30 420 180)"/>
    <rect x="460" y="200" width="60" height="40" rx="2" transform="rotate(30 490 220)"/>
    <rect x="530" y="240" width="60" height="40" rx="2" transform="rotate(30 560 260)"/>
  </g>
  <!-- Wiring Schematic Line -->
  <path d="M280 280 Q 400 420 650 420" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="6,6"/>
  <!-- Title Badge -->
  <rect x="40" y="30" width="380" height="50" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
  <text x="60" y="60" font-family="monospace" font-size="16" font-weight="bold" fill="#f59e0b">{title}</text>
  <text x="400" y="470" font-family="sans-serif" font-size="14" font-weight="bold" fill="#e2e8f0" text-anchor="middle">HEAD ENGINEER GANDHAMANENI GOUTHAM • CERTIFIED CAD BLUEPRINT</text>
</svg>'''
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

print("PANEL:", make_panel_svg()[:50])
