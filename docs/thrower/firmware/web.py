# Optional phone remote over Wi-Fi (Pico 2 W). The robot opens its own access
# point; join it and open http://192.168.4.1. Phone sliders override the knobs
# until a knob is turned again (see Knob in logic.py).
import asyncio

PAGE = """<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1">
<title>PingPongThrower</title><style>
body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#111;color:#eee;max-width:520px}
h1{font-size:20px;margin:0 0 12px}button{font-size:17px;padding:14px;border:0;border-radius:10px;margin:4px 0;width:100%;
background:#333;color:#eee}button.on{background:#e4572e}label{display:block;margin:14px 0 4px}
input[type=range]{width:100%}.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}#st{opacity:.75;font-size:14px}
[hidden]{display:none!important}small{opacity:.6;font-size:13px}
</style></head><body><h1>PingPongThrower <small id=ph></small></h1>
<div class=row><button id=motors onclick="cmd('motors')">Motors</button><button id=feed class=f onclick="cmd('feed')">Feed</button>
<button class=f onclick="cmd('feed',1)">1 ball</button></div>
<div class="row s"><button onclick="sw('off')">Aim centre</button><button onclick="sw('sweep')">Sweep</button>
<button onclick="sw('step3')">L-C-R</button></div><button class=s onclick="sw('random')">Random</button>
<label>Speed <span id=vspeed></span></label><input id=speed type=range min=0 max=1 step=.01 onchange="set(this)">
<label>Spin (left backspin / right topspin) <span id=vspin></span></label><input id=spin type=range min=0 max=1 step=.01 onchange="set(this)">
<div class=f><label>Rate <span id=vrate></span></label><input id=rate type=range min=0 max=1 step=.01 onchange="set(this)"></div>
<div class=s><label>Swing width ° <span id=vwidth></span></label><input id=width type=range min=0 max=35 step=1 onchange="set(this)">
<label>Sweep period s <span id=vperiod></span></label><input id=period type=range min=1 max=10 step=.5 onchange="set(this)"></div>
<p id=st></p><script>
const q=(u)=>fetch(u).then(r=>r.json()).then(show);
function cmd(b,l){q('/api/cmd?b='+b+(l?'&long=1':''))}
function sw(m){q('/api/swing?mode='+m)}
function set(e){q('/api/set?'+e.id+'='+e.value)}
function show(s){for(const[c,k]of[['f','feed'],['s','swing']])document.querySelectorAll('.'+c).forEach(e=>e.hidden=!s.has[k]);
 document.getElementById('ph').textContent=!s.has.panel?'· test phase '+s.phase:'';
 for(const k of['speed','spin','rate','width','period']){const e=document.getElementById(k);
 if(document.activeElement!==e)e.value=s[k];document.getElementById('v'+k).textContent=s[k]}
 document.getElementById('motors').className=s.motors?'on':'';document.getElementById('feed').className=s.feeding?'on':'';
 document.getElementById('st').textContent=(s.ready?'READY':s.motors?'spinning up':'idle')+
 (s.has.swing?' · swing '+s.swing+' · aim '+s.aim+'°':'')+(s.has.feed?' · one ball every '+s.interval+' s · balls '+s.balls:
 s.ready?' · drop a ball into the head':'')+(s.fault?' · DRIVER FAULT':'')}
setInterval(()=>q('/api/state'),700);q('/api/state')</script></body></html>"""


def _query(path):
    out = {}
    if "?" in path:
        for kv in path.split("?", 1)[1].split("&"):
            if "=" in kv:
                k, v = kv.split("=", 1)
                out[k] = v
    return out


def handle_api(thrower, path):
    """Apply an /api/... request to the thrower and return its status dict."""
    args = _query(path)
    route = path.split("?", 1)[0]
    if route == "/api/cmd" and args.get("b") in ("motors", "swing", "feed"):
        thrower.press(args["b"], long=args.get("long") == "1")
    elif route == "/api/swing" and args.get("mode") in ("off", "sweep", "step3", "random"):
        thrower.set_swing(args["mode"])
    elif route == "/api/set":
        for k in ("speed", "spin", "rate"):
            if k in args:
                thrower.knobs[k].set(float(args[k]))
        if "width" in args:
            thrower.swing_width = max(0.0, min(float(args["width"]), thrower.cfg.SWING_LIMIT))
        if "period" in args:
            thrower.swing_period = max(1.0, min(float(args["period"]), 10.0))
    return thrower.status()


async def _client(reader, writer, thrower):
    try:
        line = await reader.readline()
        while True:                               # drain headers
            h = await reader.readline()
            if not h or h == b"\r\n":
                break
        parts = line.decode().split(" ")
        path = parts[1] if len(parts) > 1 else "/"
        if path.startswith("/api/"):
            import json
            body = json.dumps(handle_api(thrower, path))
            ctype = "application/json"
        else:
            body, ctype = PAGE, "text/html"
        writer.write("HTTP/1.0 200 OK\r\nContent-Type: %s\r\nCache-Control: no-store\r\n\r\n" % ctype)
        writer.write(body)
        await writer.drain()
    except Exception as e:                        # never let a bad request stop the robot
        print("web:", e)
    finally:
        writer.close()
        await writer.wait_closed()


async def serve(thrower, cfg):
    import network
    ap = network.WLAN(network.AP_IF)
    ap.config(essid=cfg.WIFI_SSID, password=cfg.WIFI_PASSWORD)
    ap.active(True)
    while not ap.active():
        await asyncio.sleep_ms(100)
    print("Wi-Fi AP", cfg.WIFI_SSID, "→ http://%s" % ap.ifconfig()[0])
    await asyncio.start_server(lambda r, w: _client(r, w, thrower), "0.0.0.0", cfg.WIFI_PORT)
