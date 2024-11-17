import React, { useRef, useEffect } from 'react';

const RunInitiative = ({ creatures }) => {
    const newWindowRef = useRef(null);

    const openNewWindow = () => {
        if (!newWindowRef.current || newWindowRef.current.closed) {
            newWindowRef.current = window.open("", "_blank", "width=500,height=500");

            newWindowRef.current.document.write(`
                <html>
                    <head>
                        <title>Initiative Tracker</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif;
                                padding: 0;
                                margin: 0;
                                color: #f4e7c3; /* Light earthy tone for fantasy theme */
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                overflow: hidden;
                                background-image: url("/Background/goldrush.gif"); /* Set background GIF */
                                background-size: cover;
                                background-position: center;
                            }
                            .container { 
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                padding: 20px;
                                border-radius: 10px;
                                width: 90%;
                                max-width: 400px;
                                text-align: center;
                            }
                            .hp-bar-container {
                                display: none; /* Initially hidden */
                                width: 100%;
                                margin-top: 10px;
                            }
                            .hp-bar {
                                width: 100%;
                                height: 15px;
                                background: #6d4c41; /* Earthy background color */
                                border-radius: 5px;
                                overflow: hidden;
                                position: relative;
                            }
                            .hp {
                                height: 100%;
                                background: #8bc34a; /* Toned-down green for health */
                                transition: width 0.5s;
                                position: absolute;
                                left: 0;
                            }
                            .temp-hp {
                                height: 100%;
                                background: #ffb74d; /* Muted yellow for temp HP */
                                position: absolute;
                                bottom: 0;
                                left: 0;
                                transition: width 0.5s;
                            }
                            #next-btn {
                                margin-top: 15px;
                                padding: 10px 20px;
                                background: #8c7b75; /* Earthy button color */
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                            }
                            .creature-image {
                                width: 250px;
                                height: 250px;
                                border-radius: 50%;
                                object-fit: cover;
                                background-size: cover;
                                background-position: center;
                                margin-bottom: 10px;
                                border: 3px solid #3e2723; /* Charcoal border color */
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="creature-image" id="creature-image"></div>
                            <h2 id="creature-name"></h2>
                            <div class="hp-bar-container" id="hp-bar-container">
                                <div class="hp-bar">
                                    <div class="hp" id="current-hp"></div>
                                    <div class="temp-hp" id="temp-hp"></div>
                                </div>
                                <h3 id="hp-text"></h3>
                            </div>
                            <button id="next-btn">Next</button>
                        </div>
                        <script>
                            let currentIndex = 0;
                            let creatures = ${JSON.stringify(creatures)};

                            window.addEventListener('message', (event) => {
                                if (event.data.type === 'UPDATE_CREATURES') {
                                    creatures = event.data.creatures;
                                    updateDisplay();
                                }
                            });

                            function updateDisplay() {
                                if (!creatures || creatures.length === 0) return;

                                const creature = creatures[currentIndex];
                                if (!creature) return;

                                const isGood = creature.alignment === "Good";

                                const creatureImage = document.getElementById('creature-image');
                                const creatureName = document.getElementById('creature-name');
                                const hpBarContainer = document.getElementById('hp-bar-container');
                                const currentHP = document.getElementById('current-hp');
                                const tempHP = document.getElementById('temp-hp');
                                const hpText = document.getElementById('hp-text');

                                creatureImage.style.backgroundImage = 'url("/creatureimages/' + creature.name.replace(/ \\d+$/, "") + '.png")';
                                creatureName.innerText = creature.name;

                                if (isGood) {
                                    const greenWidth = (creature.health / creature.totalHealth) * 100;
                                    const tempHPWidth = creature.tempHP > 0 ? (creature.tempHP / creature.totalHealth) * 100 : 0;

                                    hpBarContainer.style.display = "block"; // Show health info
                                    currentHP.style.width = greenWidth + "%";
                                    tempHP.style.width = tempHPWidth + "%";
                                    hpText.innerText = 'Current HP: ' + creature.health + ' / ' + creature.totalHealth + (creature.tempHP > 0 ? ' (' + creature.tempHP + ')' : '');
                                } else {
                                    hpBarContainer.style.display = "none"; // Hide health info
                                    hpText.innerText = ""; // Clear HP text
                                }
                            }

                            document.getElementById('next-btn').onclick = function() {
                                currentIndex = (currentIndex + 1) % creatures.length;
                                updateDisplay();
                            };

                            updateDisplay();
                        </script>
                    </body>
                </html>
            `);

            newWindowRef.current.document.close();
        }
    };

    useEffect(() => {
        if (newWindowRef.current && !newWindowRef.current.closed) {
            newWindowRef.current.postMessage({
                type: 'UPDATE_CREATURES',
                creatures: creatures
            }, '*');
        }
    }, [creatures]);

    useEffect(() => {
        return () => {
            if (newWindowRef.current) {
                newWindowRef.current.close();
            }
        };
    }, []);

    return (
        <div>
            <button onClick={openNewWindow}>Run Initiative</button>
        </div>
    );
};

export default RunInitiative;
