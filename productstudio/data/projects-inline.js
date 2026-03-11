// Inline fallback for projects markdown so the app can run without a server.
// This file sets window.PROJECTS_MD which the app will use if fetching
// `data/projects.md` fails (for example when opening via file://).


// NEW PROJECT TEMPLATE (copy this block into the markdown area below)
/*
## Project: Project Title Here
**Industries:** Industry1, Industry2
**Technology:** Tech stack / libs / hosting
**Current State:** Idea / Discovery / Prototype / Working / Paused / Stopped
**Next Step:** Short next actionable step
**Link:** [Optional link text](https://example.com)
**Tags:** tag1, tag2, tag3

---
*/

window.PROJECTS_MD = `

# Projects Portfolio

## Project: Boquercomm - Spanish events live translator
**Industries:** Events, Translation
**Technology:** Ruby 
**Current State:** Paused
**Next Step:** Make rebootable (on Fly)
**Link:** https://ianmoss.com/livetranslator
**Tags:** Translation, AI, Machine Translation, Live Events Translation

---

## Project: Helloworld_rb
**Industries:** Collaboration, Mob Progrraming, Ruby
**Technology:** Ruby, Codespaces, Mob Timer
**Current State:** Paused
**Next Step:**  Update for the post twitter era
**Link:** https://ianmoss.com/helloworld
**Tags:** mobprogramming, ruby, collaboration

---

## Project: Email Monitoring For Startup Founders.
**Industries:** Productivity, Startups 
**Technology:** Ruby On Rails, Fly, IMAP, Fastmail API 
**Current State:** Prototype
**Next Step:** Try simpler prototype than what Claude Code produced
**Tags:** productivity, startups, ruby, imap, fastmail

---

## Project: Ticket Booking Demonstrator 
**Industries:** Train Travel, Festival Ticket Sales  
**Technology:** Java / JMS  
**Current State:** Working  
**Next Step:** Video of it working in terminal  
**Tags:** traintravel, festivalticketsales, java, jms  

---

## Project: Tuesday At 8 - Curated online matching, and in-person dating. 
**Industries:** Dating, Relationships  
**Current State:** User Research in NYC via survey creation  
**Next Step:** Build demonstrator  
**Tags:** Dating, Videochat, Matching, Relationships  

---

## Project: Context Ads - A banner exchange system, with context. 
**Industries:** Marketing, Banner, Google Adwords  
**Current State:** Prototype  
**Link:** [View Prototype](https://contextads.lovable.app)  
**Next Step:** Try something simpler  
**Tags:** Banner, Marketing, Adwords, Lovable  

---

## Project: Introductions - Applying for a job direct does not work, but who really helps? 
**Industries:** Recruitment  
**Current State:** Iterating Weekly. 5+ users  
**Next Step:** Allow introducers to add public profiles over what they are looking for  
**Link:** [View Project](https://introductions.base44.com)  
**Tags:** recruitment, base44, introductions, community  

---

## Project: Ferrol Bus Information 
**Industries:** Local Transportation, Galicia  
**Current State:** Prototype  
**Next Step:** Finding partner consultancy with local government credentials  
**Tags:** Travel, Local Travel, Buses, Spain, Galicia

---

`;
