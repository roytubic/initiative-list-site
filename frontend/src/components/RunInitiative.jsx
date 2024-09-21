import React from 'react';

const RunInitiative = ({ creatures }) => {
    const openNewWindow = () => {
        const newWindow = window.open("", "_blank", "width=600,height=400");

        let currentIndex = 0; // Initialize the current index

        // Write the HTML content
        newWindow.document.write(`
            <html>
                <head>
                    <title>Initiative Tracker</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 20px; 
                            margin: 0; 
                            color: white; 
                            position: relative; 
                            height: 100%; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                        }
                        .container { 
                            position: relative; 
                            background: rgba(0, 0, 0, 0.7); 
                            padding: 20px; 
                            border-radius: 10px; 
                            width: 80%; 
                            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5); 
                        }
                        .hp-bar {
                            width: 100%;
                            height: 20px;
                            position: relative;
                            border-radius: 5px;
                            overflow: hidden;
                            margin-top: 10px;
                            background: #444; /* Base color for the HP bar */
                        }
                        .hp {
                            height: 100%;
                            background: green;
                            transition: width 0.5s;
                            position: absolute;
                            left: 0;
                        }
                        .temp-hp {
                            height: 100%;
                            background: yellow;
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            transition: width 0.5s;
                        }
                        .negative-temp-hp {
                            height: 100%;
                            background: blue;
                            position: absolute;
                            bottom: 0;
                            right: 0; /* Start from the right */
                        }
                        .creature-image {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            z-index: -1; /* Send image to the back */
                            background-size: cover;
                            background-position: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="creature-image"></div>
                    <div class="container">
                        <h2></h2>
                        <div class="hp-bar">
                            <div class="hp"></div>
                            <div class="hp" style="background: red;"></div>
                            <div class="negative-temp-hp"></div>
                            <div class="temp-hp"></div>
                        </div>
                        <h3></h3>
                        <button id="next-btn">Next</button>
                    </div>
                    <script>
                        let currentIndex = ${currentIndex}; // Initialize index
                        const creatures = ${JSON.stringify(creatures)};

                        function updateDisplay() {
                            const creature = creatures[currentIndex]; // Get the current creature
                            const currentHP = creature.health;
                            const totalHealth = creature.totalHealth;
                            const tempHP = creature.tempHP;

                            // Calculate widths for the HP bar
                            const greenWidth = (currentHP / totalHealth) * 100;
                            const redWidth = ((totalHealth - currentHP) / totalHealth) * 100;
                            const blueWidth = (tempHP < 0 ? (-tempHP / totalHealth) * 100 : 0);
                            const yellowWidth = (tempHP > 0 ? (tempHP / totalHealth) * 100 : 0);

                            document.querySelector('.creature-image').style.backgroundImage = 'url("/creatureimages/' + creature.name + '.jpg")';
                            document.querySelector('h2').innerText = creature.name;
                            document.querySelector('h3').innerText = 'Current HP:' + currentHP + ' / ' + totalHealth + (tempHP > 0 && tempHP !== undefined ? ' (' + tempHP + ')' : '');
                            
                            document.querySelector('.hp').style.width = greenWidth + '%';
                            document.querySelector('.hp:last-of-type').style.width = redWidth + '%';
                            document.querySelector('.negative-temp-hp').style.width = blueWidth + '%';
                            document.querySelector('.temp-hp').style.width = yellowWidth + '%';

                        }

                        document.getElementById('next-btn').onclick = function() {
                            console.log('Next button clicked. Current Index:', currentIndex);
                            currentIndex++;
                            if (currentIndex >= creatures.length) {
                                currentIndex = 0; // Reset to first creature
                            }
                            console.log('Updating display for:', creatures[currentIndex]);
                            updateDisplay();
                        };

                        // Initial display update
                        updateDisplay();
                    </script>
                </body>
            </html>
        `);

        newWindow.document.close(); // Ensure the document is closed after writing
    };

    return (
        <div>
            <button onClick={openNewWindow}>Run Initiative</button>
        </div>
    );
};

export default RunInitiative;
