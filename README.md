<div align="center">
  <img src="https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=800&auto=format&fit=crop" width="100%" style="border-radius: 12px; margin-bottom: 20px;" alt="GengaOS Cover Image" />
  
  <h1>GengaOS</h1>
  <p><b>The "Director-First" Generative Anime Operating System</b></p>
  
  <p>
    <a href="#about">About</a> • 
    <a href="#core-features">Features</a> • 
    <a href="#installation">Installation</a> • 
    <a href="#philosophy">Philosophy</a>
  </p>
</div>

---

## 🎬 About GengaOS

**Stop gambling with AI slot machines. Start directing.**

GengaOS is an open-source, node-based workspace designed exclusively for solo indie anime directors. Built on top of React Flow and Tauri, it acts as a massive orchestration engine that allows you to chain together absolute control over Character IP-Adapters, Video-to-Video Kinematics, 2.5D Multiplane Parallax, and Audio/Lip-Sync logic into a unified "Studio Canvas". 

This is not a toy wrapper for ChatGPT. It is a terrifyingly accurate digital replica of a high-end Tokyo Animation Studio, condensed into a single visual programming canvas.

---

## ⚙️ The AAA Anime Studio Pipeline (Core Features)

### 1. Absolute Character Locking (Settei Node)
No more flickering characters. GengaOS requires you to define a "Settei" (Character Model Sheet). It dynamically locks this character's visual identity across every single shot using Advanced IP-Adapter weight routing.

### 2. Sakuga V2V Kinematics Extraction
Don't let the AI guess how gravity works. The Sakuga Engine allows you to drop a raw `.mp4` video of live-action fight choreography. GengaOS utilizes **DWPose** to extract the highly complex martial arts skeleton, and renders your Settei character performing the exact kinetic motion flawlessly.

### 3. The Multiplane Depth Parallax
Take your flat AI generations and breathe life into them. The Multiplane Node runs **Depth-Anything-V2** over the image, physically slicing it into separated Foreground, Midground (Actor), and Background layers. You can then inject custom Deforum camera panning paths inside a simulated 3D space.

### 4. Audio "Dope Sheet" & Wav2Lip Synchronization
An anime falls apart without voice acting. The Timeline node acts as a traditional Japanese "X-Sheet", mapping your audio waveform directly beneath your animation frames. We automatically map phonetic visemes to force your character's mouth flaps to match the dialogue perfectly.

### 5. Independent Compute Freedom (BYOK / Local)
GengaOS permanently solves the problem of platform lock-in. Inside the UI, the **Hardware Compute Core** allows you to explicitly route your entire graph:
*   **Without a Gaming PC:** Route to Cloud API Endpoints (OpenAI, Fal.ai Serverless) using only a few pennies of API credits.
*   **With a Gaming PC:** Route text to **Ollama (Port 11434)** and images to an invisible, headless **ComfyUI (Port 8188)** instance running on your bare metal. Infinite, offline, free anime generation.

---

## 🚀 Getting Started

*Note: GengaOS is currently completing Phase 5 of its UI architecture. The upcoming 1-Click Installer (Tauri `.exe`) is in active development.*

### Developer Setup (Web Studio Mode)

If you want to run the React Studio canvas locally:

```bash
# Clone the repository
git clone https://github.com/0x404ethsol/GengaOS.git
cd GengaOS

# Move into the frontend application
cd apps/web-studio

# Install dependencies
npm install

# Run the React Flow UI Canvas
npm run dev
```

### Starting the Python Sidecar
The UI will attempt to serialize the DAG (Directed Acyclic Graph) of your animation and send it to the local Python Sidecar to translate into Machine Learning API requests.

```bash
# Inside a second terminal window
cd apps/web-studio/src-tauri/bin/

# Start the Sidecar API (Requires Python 3.10+)
pip install fastapi uvicorn pydantic httpx
python sidecar.py
```
*The Sidecar will boot on `http://127.0.0.1:8000/` and begin accepting structural payloads from the UI.*

---

## ⚔️ The Philosophy: Visual Nodes > Chatbots
You cannot direct a 24-minute cinematic episode of high-intensity anime by typing text into a chatbot window. 

A human director needs to see the **Script**, alongside the **Storyboards** (Ekonte), underneath the **Voice Actor Audio Track**, locked to the **Character Design Spec** (Settei), wired directly into the **Post-Processing Compositor** (Nuke/AE). 

GengaOS exposes the mathematical reality of these Machine Learning models through a node-based architecture, forcing the AI to yield absolute creative control to the human artist sitting in the director's chair.

---
*Built by 0x404ethsol.*
