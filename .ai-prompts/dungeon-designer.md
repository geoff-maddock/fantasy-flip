# Dungeon Designer

## Description
A tool to help design adventure boards for the FANTAY FLIP Game.

I'm spiking on using AI tools to rapidly develop a tool that will help me prototype this game.

Trying out various AI tools including:

https://bolt.new
V0
Claude

## Prompts I've used to generate code


# Prompt 1
i'd like to create a web app tool that will help me design boards for my table top game.

i will outline how the tools should work going foreward, but i'll start with the first board - the dungeon board.

the boards are 2d surfaces that are 6" x 6".  players will follow the rules on the board and mark spaces on the board with a dry erase marker.

the tool should help me prototype the design of the board, including the layout, iconography, text, as well as the main mechanism of the board.

the main play space of the board will be a 16 x 16 grid (perhaps make this variable in the app ui), which depicts a maze that the players will be traversing.  there is a distinct entrance.   in the maze, some spaces will be blocked entirely, some will be blocked by walls, some will require various things to pass through, including "keys", "supplies", "mana", "gold".  some spaces will be colored with red, orange, yellow, green, blue or purple, and will require a resource of that color to pass info.   some spaces will be occupied by an encounter (explained later) and some spaces will be occupied by treasure (explained later). there will also be six relic spaces on the board, where the player must end exactly on the space to gain the relic.   I would like the app to help me iterated on different configurations of this maze.

the dungeon board rules are as follows:
draw one card per available action from the adventure deck and turn them over below the board
on the board there will be a key of available actions that will correspond to the value of the card draw. each action is a "tetris" style tesselation piece with different sizes between 2-6, and various shapes.
the player may pick one shape to place on the maze per card, and matching the shape that matches the value on their drawn card.
when placing a tile shape, they must connect it to a path they have already followed on the board.
they will draw in the shape on the maze with their dry erase, paying any required costs.
if they land on an encounter, they follow the encounter rules
if they land on a treasure, they follow the treasure rules
The UI of this app should help me design the board, either with manual tools, or methods to randomly generate, then save different boards.  Ideally both.

# Prompt 2
This is great so far.  Here are a few refinements that I'd like to add.

When I mouse over a space on the dungeon grid that is filled in, I would like a tool tip that explains the type of space that it is.

Under tools, rather than simply "Blocked", I would like to have four different types of "Blocked Walls" - one for each side of the grid square - top, bottom, left, right.  I would like each grid space to be able to have these walls, as well as any of the other cell types at the same time.

For each Action Shape value, present three different shapes.
The lowest value shape should have two squares, the highest value shape should be six squares.   For each action shape, I would like to configure which card values correspond to which shapes, but as a default, lets use:
Card Value:  2,3,4 is  Shape sizes: 2 square
Card Value:  5, 6 is Shape sizes: 3 squares
Card Value: 7,8 is Shape sizes: 4 squares
Card Value: 9, 10 is Shape sizes: 5 squares
Card Value: Ace is Shape size: 6 squares
Card Value: Face Card is Automatic encounter, no shapes

I would like an additional tool to simulate a series of card draws for a player.  I will click to draw a card, and based on the card drawn, the app will lay a tile in the first most logical spaces on the board.  If there are no available spaces, then it will indicate so, and keep drawing cards until it finds one that works.   In future iterations, I would like to have "auto runs" that will determine the quality of a board, by checking how many turns it takes to get all the available relics on the board.

# Prompt 3

That fix worked.

Lets make a few changes to the cell types.

Remove the "Blocked" type. Wall handles this case.
Remove the "Gold" type. Treasure handles this case.
Lets change the cells so that the cell type and the color can be set independantly.  A cell can have "no color requirement", or one of the colors.  Then it can be empty, or one of the cell types.  Finally, it can have one of the four walls - top, right, bottom or left.

# Prompt 4 (Bolt)

Let's refine how the Action Shapes work.

There should just be 5 levels of action shapes.
Each level corresponds to a shape made up of a number of grid squares which must be orthoganally adjacent to each other.
Level one contains 2 squares, level two contains 3 squares, level three contains 4 squares, level four contains 5 squares, and level five contains 6 squares.
When the action shapes are placed on the dungeon board, they can be layed over any space that is not blocked by a wall.  The first space must overlap the entrance, and any future spaces much touch an existing space.


# Prompt 5
Lets make another change to how the cell types display on the dungeon. I want to keep the icons, but I want the background color to only match the color requirements that have been set for the cell

# Prompt 6 (Copilot w/ Claude 3.7)
@workspace Lets make another change to how the cell types display on the dungeon. I want to keep the icons, but I want the background color to only match the color requirements that have been set for the cell

# Prompt 7
In order to make the cell type icons stand out more, add a 1px black border around them. doesn't have to be a "border", but just a black outline

# Prompt 8
@workspace In order to make the cell type icons stand out more, add a 1px black border around them. doesn't have to be a "border", but just a black outline

# Prompt 9
@workspace Lets enhance how the card draw simulator works. First, lets establish that when we're drawing cards and laying action shapes on the dungeon, this is happening on a layer above the dungeon layer that has the same dimensions. Let's refer to this as the 'action layer'.

When an action shape is placed in the action layer, no new shape can overlap with another action shape that has been already placed. Shapes must also always fit within the borders of the action layer. Shapes can however be rotated in order to find an ideal placement. When placing a shape, at least one of its sides must be adjacent to either the entrance space in the dungeon layer, or an existing action shape. Shapes placed on an action layer must never cover up a WALL cell type space, which includes both the wall cell type, or crossing over walls that are placed on the top, bottom, left or right.

When a card is drawn and an action shape is placed, display that action shape visually on top of the dungeon board.

# Prompt 10
@workspace a button next to "Draw Card" in the Card Draw Simulator to Reset the deck. This will reshuffle and reset the deck to the full 52 cards, and wipe out all the shapes placed on the place shape board.

# Prompt 11
@workspace Modify the Card Draw Simulator. Add a variable to determine the total number of decks to use to draw from. This should default to one deck. Prior to any cards being drawn, display the number of cards in the deck remaining in the draw card button. When the deck is empty, do not allow any more cards to be drawn. Inside of the Card Draw Simulator, display a count of the number of cells remaining in the placed shap area that have not been covered by a shape cell.

# Prompt 12
@workspace Something broke with this last change. In addition to the rules in my last request, we need to keep the rule for placing an action shape where they must be placed entirely within the boundary of the board, as well as not overlapping with any action shape that has already been placed on the board. They must also be placed on top of the entrance or adjacent to an existing placed action shape.

# Prompt 13
@workspace Change the rules around where action shapes can be placed in the action layer. The shapes cannot overlap any wall cell type. But they can overlap any other cell type. When a player lays over any non-wall cell type, they resolve all of the actions related to the cells. Ex: Pick up a Key, Pick up Supplies, Pick Up Treasure, Resolve an Encounter, Gain Mana

# Prompt 14
@workspace It appears that the deck of cards being used is not a standard deck. Make sure the 52 card deck contains exactly the standard set of playing cards, no more no less.

# Prompt 15
/fix Cannot find name 'CardValue'.

# Prompt 16
@workspace Add a new feature to save to image. Add a button at the top right of the page. Save the dungeon board as a png

# Prompt 17
Include the light grey gridlines on the exported image

# Prompt 18
@workspace Lets revamp how the action shapes are initialized. I would like there to be specific shapes available at each level.

Use the following information to define them: There are five levels of tiles / action shapes, each of increasing size.

Level: 1 Draw values: 2, 3, 4 Number of tiles: 1, 2 Number of shapes: 2

1.1 |X|

1.2 |XX|

Level: 2 Draw values: 5, 6 Number of tiles: 3, 4 Number of shapes: 3

2.1 |XXX|

2.2 |XX| |X.|

2.3 |XX| |XX|

Level: 3 Draw values: 7, 8 Number of tiles: 4 Number of shapes: 3 3.1 |XXXX|

3.2 |XXX| |X..|

3.3 |.X| |XX| |X.|

Level: 4 Draw values: 9, 10 Number of tiles: 5 Number of shapes: 4 4.1 |XXXXX|

4.2 |XXXX| |X...|

4.3 |.X.| |XXX| |.X.|

4.4 |.XX| |.X.| |XX.|

Level: 5 Draw values: A Number of tiles: 6 Number of shapes: 4

5.1 |XXXXXX| 5.2 |XXXXX| |X....| 5.3 |XXX| |XXX| 5.4 |XX| |XX| |XX|

# Prompt 20
Let's modify the rules for placing a action shape tile. Keep all the existing rules, but also allow the shapes to be flipped before placing them, as well as rotating, in order to find a legal placement.

# Prompt 21
@workspace Sometimes when placing a card, I'm getting this error: CardDrawSimulator.tsx:153 Uncaught ReferenceError: flipShapeHorizontal is not defined at tryPlaceShape (CardDrawSimulator.tsx:153:9) at drawCard (CardDrawSimulator.tsx:81:5)

# Prompt 22
@workspace Modify the options around generating a random board. For each cell type, wall plaacement and color, let the user optionally set the max number or an exact number of the cells that will be set when generate random is clicked.

# Prompt 23
Add a button next to random board settings to reset the current dungeon board to the initial empty board


# Prompt 24
Split the function of "Random Board Settings" into two buttons.

FIrst, "Board Settings", should work the same way "Random Board Settings" works now, which is to open a modal window that allows the user to specify some settings for the next generated board. Add a button on that form to enable "true random" which will ignore the settings specified and draw a truely random board.

Secondly, add a button that will appear on the main page next to "Board Settings" for "Generate Board". This will generate a new board using the currently specified settings without opening a modal

# Prompt 25

@workspace review and summarize the purpose and functionality of the app. then update the readme.md with that information, as well as technical information on how to set up and run the app

# Prompt 26
@workspace I would like to add one more cell type to the available cell types. This cell type is "Lock"


# Prompt 27
Lets add an advanced board generation feature. Instead of generating a purely random board, I would like a semi-random board to be generated that creates a fun, playable maze for players of the game to use.

Lets still use the parameters in the board settings to set the number of cell types that will be used in the dungeon. However, some specific cell types should be handled differently when the board is generated. I would like Relic cells to be spread out evenly, but far away from the entrance. I would like treasure cells to be spread out evenly across the sections of the board, with more appearing further away from the entrance. I would like key cells to be closer to the entrance.

I would also like the wall cells to be placed in a manner so that they never are blocking a player from reaching any other cell via normal moves. ie: they should never fully surround another cell, or fully block off a section of cells that contain other cell types.

# Enhancements
- Tile Generation (rename action shapes?)
    - The generated shapes aren't displayed quite right, it's not clear if they are correct.
    - Perhaps just change to a "predefined" set of shapes
- Tile Placement 
    - Make sure the tool that places the shapes knows where all it can attempt to place
        - The whole shape falls within the board
        - The shape can be rotated any amount (90, 180, 270)
        - Adjacent to any placed shape, with any side touching 
        - Cannot overlap any wall (solid) space
        - The shape cannot cross over any side wall space (top, bottom, left, right)
    - Set some additional goals for tile placement
        - Check every possible placement and select the placement that gets closer to valuable goals in this order
            - Relic, treasure, mana, supplies, keys
            - How to decide?  
                - If any of the goals can be reached with the current tile, take that
                - If no goals can be reached with the current tile, move towards the highest value goal
                - If there are none of the goal type, move to the next goal type
- Generation
    - Add parameters to generation 
        - dimensions of board
        - number of all cells to add
        - percent of each cell type
        - percent of each color
- Split the maze generation and the object placement?
    - this way a cool maze can be generated first?