i'd like to create a web app tool that will help me design boards for my table top game.

i will outline how the tools should work going foreward, but i'll start with the first board - the dungeon board.

the boards are 2d surfaces that are 6" x 6".  players will follow the rules on the board and mark spaces on the board with a dry erase marker.

the tool should help me prototype the design of the board, including the layout, iconography, text, as well as the main mechanism of the board.

the main play space of the board will be a 16 x 16 grid (perhaps make this variable in the app ui), which depicts a maze that the players will be traversing.  there is a distinct entrance.   in the maze, some spaces will be blocked entirely, some will be blocked by walls, some will require various things to pass through, including "keys", "supplies", "mana", "gold".  some spaces will be colored with red, orange, yellow, green, blue or purple, and will require a resource of that color to pass info.   some spaces will be occupied by an encounter (explained later) and some spaces will be occupied by treasure (explained later). there will also be six relic spaces on the board, where the player must end exactly on the space to gain the relic.   I would like the app to help me iterated on different configurations of this maze.

the dungeon board rules are as follows:
- draw one card per available action from the adventure deck and turn them over below the board
- on the board there will be a key of available actions that will correspond to the value of the card draw.   each action is a "tetris" style tesselation piece with different sizes between 2-6, and various shapes.  
- the player may pick one shape to place on the maze per card, and matching the shape that matches the value on their  drawn card.   
- when placing a tile shape, they must connect it to a path they have already followed on the board.
- they will draw in the shape on the maze with their dry erase, paying any required costs.
- if they land on an encounter, they follow the encounter rules
- if they land on a treasure, they follow the treasure rules

The UI of this app should help me design the board, either with manual tools, or methods to randomly generate, then save different boards.  Ideally both.