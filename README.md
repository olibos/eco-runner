# Eco Runner

Eco Runner is a gamified web application inspired by the classic demomakers from the early days of computing. It features dynamic background tracks and generated music reminiscent of the classic PlayStation game *Wipeout*.

## The Idea

With the rising cost of fuel, this project aims to encourage employees to reduce their fuel consumption by introducing a reward-based game. Using data from company fuel cards, the application tracks and sets practical objectives such as:
- Reducing total kilometers driven
- Optimizing overall vehicle usage
- Lowering average speed to decrease the overall liters per 100km (L/100km) fuel consumption

Employees can earn prizes by achieving these eco-friendly targets.

## Credits & Technology

A huge thanks and massive credit goes to [Phoboslab](https://phoboslab.org/log/2015/04/reverse-engineering-wipeout-psx) for their incredible work on reverse engineering Wipeout PSX. 

The reverse-engineered code and track rendering logic from Phoboslab were utilized as the foundation for the visuals in this project. The original implementation has since been upgraded and refactored to modern web standards using AI.

Track assets and geometry files used in this project are from the original *Wipeout* game, developed by **Psygnosis** and published by **Sony Computer Entertainment**.

Background music tracks (`src/assets/background.opus.webm` and `src/assets/background.vorbis.webm`) were generated using [Suno: AI for Music Creators](https://suno.com/).

The Wipeout-inspired font `FX300-Angular.ttf` is from [NR74W/WipEout-Fonts](https://github.com/NR74W/WipEout-Fonts).
