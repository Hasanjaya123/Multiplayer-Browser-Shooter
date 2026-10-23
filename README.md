# 🪖 Outpost 2D — Multiplayer Browser Shooter

> **Inspired by _Doodle Army 2: Mini Militia_ • Built with Gemini 4 Argon**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](#1-quick-start-local-host)
[![Tick Rate](https://img.shields.io/badge/Server_Physics-60_Hz_Authoritative-00d2d3)](#architecture--netcode-highlights)
[![Snapshots](https://img.shields.io/badge/Net_Snapshots-30_Hz_Compact_Tuples-2ed573)](#architecture--netcode-highlights)
[![Platform](https://img.shields.io/badge/Controls-PC_%26_Mobile_Browser-ff9f43)](#controls--gameplay-guide)
[![Tunneling](https://img.shields.io/badge/Recommended_Tunnel-Cloudflare_Tunnel-F38020?logo=cloudflare&logoColor=white)](#3-play-over-the-internet-cloudflare-tunnel--recommended)

**Outpost 2D** is a high-performance, 60+ FPS 2D multiplayer browser shooter inspired by the classic **_Doodle Army 2: Mini Militia_ (Outpost Map)** and created using **Gemini 4 Argon**. It runs an authoritative 60 Hz physics server directly on your laptop so you and your friends can battle in real time over **Local Wi-Fi / LAN** or across the internet using a **Cloudflare Tunnel**—with **zero external asset downloads** (100% procedural HTML5 Canvas graphics & Web Audio API synthesis).

---

## 🧭 Interactive Navigation

- [1. Quick Start (Launch the Game Locally)](#1-quick-start-local-host)
- [2. Play with Friends on Local Wi-Fi / LAN](#2-play-with-friends-on-local-wi-fi--lan)
- [3. Play Over the Internet (Cloudflare Tunnel — ⭐ Recommended)](#3-play-over-the-internet-cloudflare-tunnel--recommended)
  - [Windows CLI Setup](#windows-cloudflare-tunnel-cli-setup)
  - [macOS CLI Setup](#macos-cloudflare-tunnel-cli-setup)
- [4. Controls & Gameplay Guide (PC & Mobile)](#4-controls--gameplay-guide-pc--mobile)
- [5. Arsenal, Rare Weapons & Tactical Bombs](#5-arsenal-rare-weapons--tactical-bombs)
- [6. Architecture & Netcode Highlights](#6-architecture--netcode-highlights)

---

## 1. Quick Start (Local Host)

### Prerequisites
- **[Node.js](https://nodejs.org/)** (v18.0.0 or newer recommended)

### Install & Launch

```bash
# 1. Install dependencies
npm install

# 2. Start the 60Hz authoritative server (binds to 0.0.0.0:3000)
npm start
```

Once started, open your browser and visit:
- **Host Player (Your Laptop):** `http://localhost:3000`

<details>
<summary><strong>💡 Click to view expected console output on startup</strong></summary>

```text
============================================================
  MINI MILITIA PC & MOBILE: OUTPOST (60Hz Server)
============================================================
  Local (This PC) : http://localhost:3000
  LAN (Friends)   : http://192.168.x.x:3000
============================================================
```
</details>

---

## 2. Play with Friends on Local Wi-Fi / LAN

If your friends are on the **same Wi-Fi network or mobile hotspot**:

1. Run `npm start` on your laptop.
2. Look at the terminal output for the **`LAN (Friends)`** address (e.g., `http://192.168.1.42:3000`).
3. Share that URL with your friends—they can open it directly in any **PC or Mobile browser** and click **JOIN BATTLE**.

<details>
<summary><strong>🛠️ Troubleshooting LAN Connections (Windows / macOS Firewall)</strong></summary>

- **Windows Firewall:** The first time you run `node server/index.js`, Windows Defender Firewall may prompt you to allow Node.js. Check both **Private** and **Public** networks and click **Allow access**.
- **Verify Port 3000:** Ensure no other service is occupying port `3000`, or set a custom port via `PORT=3000 npm start`.
</details>

---

## 3. Play Over the Internet (Cloudflare Tunnel — ⭐ Recommended)

> [!TIP]
> **Why Cloudflare Tunnel (`cloudflared`) is the Preferred Tunneling Solution:**
> We explicitly recommend **Cloudflare Tunnel** over other port-forwarding tools (such as ngrok or localtunnel) because:
> - **Zero Router Configuration:** No router admin login or manual NAT port forwarding required.
> - **Ultra-Low Latency WebSockets:** Native HTTP/2 & QUIC edge routing with seamless `ws://` / `wss://` WebSocket upgrades for 30 Hz game snapshots.
> - **No Interstitial Warning Pages:** Friends join immediately without clicking through browser security interstitials or bandwidth caps.
> - **Free Quick Tunnels:** TryCloudflare generates an instant `https://<random-words>.trycloudflare.com` URL with a single CLI command—no account login required.

Make sure your game server is running (`npm start` on port `3000`) in one terminal window, then open a **second terminal window** and follow the instructions for your OS below.

### Windows (Cloudflare Tunnel CLI Setup)

<details open>
<summary><strong>🪟 Step-by-Step Cloudflare Tunnel Instructions for Windows (PowerShell / CMD)</strong></summary>

#### Step 1: Install `cloudflared` via Winget (or Scoop / Chocolatey)
Open **PowerShell** or **Windows Terminal** and run:

```powershell
winget install --id Cloudflare.cloudflared
```

*(Alternatively, using Scoop: `scoop install cloudflared` or Chocolatey: `choco install cloudflared`)*

#### Step 2: Verify Installation
Restart your terminal if needed, then verify `cloudflared` is available:

```powershell
cloudflared --version
```

#### Step 3: Launch the Tunnel to Port 3000
With the game server running (`npm start`), run:

```powershell
cloudflared tunnel --url http://localhost:3000
```

#### Step 4: Share the Public URL with Friends
Look for the box in the terminal output containing your `.trycloudflare.com` URL:

```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://example-combat-outpost.trycloudflare.com                                          |
+--------------------------------------------------------------------------------------------+
```

Send that `https://...trycloudflare.com` link to your friends on PC or mobile anywhere in the world!
</details>

---

### macOS (Cloudflare Tunnel CLI Setup)

<details open>
<summary><strong>🍎 Step-by-Step Cloudflare Tunnel Instructions for macOS (Terminal)</strong></summary>

#### Step 1: Install `cloudflared` via Homebrew
Open **Terminal** and run:

```bash
brew install cloudflared
```

#### Step 2: Verify Installation

```bash
cloudflared --version
```

#### Step 3: Launch the Tunnel to Port 3000
Ensure the game server is running (`npm start` in another tab), then execute:

```bash
cloudflared tunnel --url http://localhost:3000
```

#### Step 4: Share the Public URL with Friends
Copy the generated `https://<random-name>.trycloudflare.com` URL printed in the terminal and share it with your friends.
</details>

<details>
<summary><strong>🔒 Optional: Persistent Custom Domain Tunnel (Advanced Cloudflare CLI)</strong></summary>

If you have a Cloudflare account and a custom domain, you can create a permanent named tunnel instead of a temporary Quick Tunnel:

```bash
# 1. Authenticate with your Cloudflare account
cloudflared tunnel login

# 2. Create a named tunnel
cloudflared tunnel create mini-militia-outpost

# 3. Route a DNS subdomain to your tunnel
cloudflared tunnel route dns mini-militia-outpost play.yourdomain.com

# 4. Run the tunnel pointing to local port 3000
cloudflared tunnel run --url http://localhost:3000 mini-militia-outpost
```
</details>

---

## 4. Controls & Gameplay Guide (PC & Mobile)

### 🖥️ PC Controls (Mouse + Keyboard)
Clicking inside the game arena engages **Pointer Lock**, keeping your tactical crosshair inside the game window so your cursor never escapes to a second monitor or outside the browser tab.

| Action | Primary Key / Mouse | Alternate Key |
| :--- | :--- | :--- |
| **Walk Left / Right** | `A` / `D` | `Left` / `Right Arrow` |
| **Jetpack Thrust (Fly)** | `W` (Hold) | `Spacebar` / `Up Arrow` |
| **Crouch / Stealth Hide** | `C` (Toggle) or `Ctrl` (Hold) | `S` / `Down Arrow` (when grounded) |
| **360° Aim & Shoot** | `Mouse Move` + `Left-Click` | — |
| **Throw Equipped Bomb** | `Right-Click` | `G` |
| **Cycle Bomb Type** | `X` | `3` (Frag → M7 Gas → Proxy Mine) |
| **Switch Held Weapons** | `Q` or `Mouse Wheel` | `1` / `2` |
| **Pick Up Ground Weapon / Crate** | `E` | — |
| **Quick Machete Melee Strike** | `V` | — |
| **Reload Weapon** | `R` | Auto-reloads on empty magazine |
| **Sniper Rifle Custom FOV Zoom** | `Mouse Wheel` (while holding Sniper) | `[` / `]` or `-` / `+` |
| **Live Scoreboard (Ping, K/D)** | `Tab` (Hold or Tap) | — |
| **Pause / Release Mouse Cursor** | `Esc` | — |

### 📱 Mobile Browser Controls (Twin-Stick Touch)
- **Left Virtual Joystick:** Drag left/right to walk, drag **up** to engage jetpack thrusters, or drag **down** to crouch.
- **Right Aim & Fire Stick:** Drag in any 360° direction to aim; push past the outer ring (or hold the dedicated **FIRE** button) to shoot.
- **Dedicated Touch Buttons:** Quick-access buttons for **FLY**, **CROUCH**, **BOMB**, **TYPE** (cycle Frag / M7 Gas / Proxy Mine), **MELEE**, **RELOAD**, **SWAP**, and **PICK UP**.

---

## 5. Arsenal, Rare Weapons & Tactical Bombs

<details>
<summary><strong>🔫 Click to explore all Weapons & Combat Stats</strong></summary>

| Weapon | Type | Highlights |
| :--- | :--- | :--- |
| **M4 Carbine** | Default Primary | Balanced automatic assault rifle with dependable accuracy and fire rate. |
| **Combat Machete** | Default Melee | Deadly close-quarters lunge strike (`60` damage). |
| **M249 SAW (Heavy MG)** | Map Pickup | `100`-round box magazine, blistering suppressive fire, mid-air recoil pushback, and a `15%` weight speed penalty. |
| **AWP Sniper Rifle** | Map Pickup | High-velocity `90` damage precision round, red laser sight line, and **customizable Sniper FOV zoom**. |
| **SPAS-12 Shotgun** | Map Pickup | Devastating close-range burst firing `8` spread pellets simultaneously. |
| **RPG-7 Launcher** | Map Pickup | Explosive rocket with Fortnite-inspired launch acoustics, smoke trail, and cartoon comic-book blast radius. |
| **M2-A1 Flamethrower** | ⭐ Rare Pickup | Pressurized fire stream that pierces close quarters and ignites enemies with lingering **Burn DoT**. |
</details>

<details>
<summary><strong>💣 Click to explore all 3 Tactical Bomb Types</strong></summary>

Press `X` (or `3` on PC / `TYPE` on Mobile) to cycle between your carried bombs:

1. **Frag Grenade (`FRAG`):** Physics-based bouncing fragmentation grenade with a 3-second fuse and lethal AoE blast (`125` max damage).
2. **M7 Toxic Gas Bomb (`M7 GAS`):** Yellow-green chemical canister that releases a lingering **toxic green cloud** for `8.5s`, draining `24 HP/s` from anyone standing inside or walking through it.
3. **Proxy Mine (`PROXY MINE`):** Compact 4-pronged deployable proximity mine that sticks to **walls, ceilings, or floors**:
   - Arms after `0.75s` and detonates automatically when a player enters its sensor radius (`126` max damage).
   - **Destructible:** Watchful players can shoot Proxy Mines, hit them with melee, or chain-detonate them with explosives.
   - **Lethal to All:** The planter can also be killed by their own Frag Grenades, M7 Toxic Gas Clouds, and armed Proxy Mines—watch your step!
</details>

<details>
<summary><strong>🌿 Map Features: Outpost Layout, Stealth Bushes & Abyss Hazard</strong></summary>

- **Outpost Multi-Tiered Arena:** Elevated metallic Left Base bunker, fortified wooden Right Base bunker, central floating rock islands, and an interconnected **underground cave tunnel system**.
- **Stealth Bushes:** Duck (`C` / `Ctrl`) inside foliage bushes across the surface and caves to conceal yourself from enemies and AI bots until you open fire or an opponent gets within close proximity.
- **Abyss Fall-Out Hazard:** Falling off the bottom perimeter of the map automatically eliminates the soldier (`THE ABYSS`) and triggers a 5-second respawn countdown.
</details>

---

## 6. Architecture & Netcode Highlights

- **Deterministic 60 Hz Shared Physics ([`shared/physics.js`](shared/physics.js)):** Identical multi-polygon slope collision, jetpack thrust, crouch hitbox scaling, and grenade/sticky-mine physics execute on both the Node.js server and browser client.
- **Client-Side Prediction & Server Reconciliation ([`public/game.js`](public/game.js)):** Local movement and jetpack flight respond on frame zero with smooth exponential error decay—zero rubber-banding.
- **Entity Interpolation Buffer:** Remote soldiers are interpolated across a buffered timeline for silky 60–144 Hz rendering even under network jitter.
- **Compact Tuple Snapshots ([`server/index.js`](server/index.js)):** 30 Hz broadcasts use flat numeric arrays with `ws` native WebSockets and `perMessageDeflate: false` to eliminate JSON bloat and garbage-collection pauses.
- **Zero-Allocation Object Pools ([`shared/pool.js`](shared/pool.js)):** Projectiles, tracers, shell casings, particles, and floating combat text are pre-allocated and recycled in memory.
- **100% Procedural Audio & Visuals ([`public/audio.js`](public/audio.js)):** Multi-layered Web Audio API synthesizer generates realistic gunshots, Fortnite-style RPG launches/explosions, flamethrower streams, and classic Mini Militia death cries on the fly.
