from puzzlefiles import *
import os
from time import sleep


def printmap(puzzle):
    for row in puzzle:
        print(row)


def findxycoord(puzzle):  # whenever puzzle is reset or next map: find start position "●"
    global coordx
    global coordy
    length = len(puzzle[0])
    breadth = len(puzzle)
    # to find start coord
    for x in range(1, breadth):
        for y in range(1, length):
            if puzzle[x][y] == "●":
                coordx = x
                coordy = y


def check(puzzle):  # for the puzzle to be completed, all x have to be
    # length and breadth varies on the puzzle size
    length = len(puzzle[0])
    breadth = len(puzzle)
    for x in range(1, breadth):
        for y in range(1, length):
            if puzzle[x][y] == "x":
                return False
    return True


def update(move, puzzle, prev):
    global coordx
    global coordy
    '''
  left2  left1 start right1 right2
    ↓      ↓     ↓     ↓      ↓
    ______│______●______│______
    '''
    if move == 1:  # left
        # At the start position and left side of current position should not have boundary
        if puzzle[coordx][coordy] == "●" and "│" not in puzzle[coordx][coordy]+puzzle[coordx][coordy-1]:
            puzzle[coordx] = puzzle[coordx][:coordy-6] + "══════●" + puzzle[coordx][coordy+1:]  # if at the start position move 6 grid to the left using slice method
            coordy -= 6  # move pos to the head of the grid
        # to move left again when it has already moved left, left side of current position should not have obstacle/boundary
        elif " ═" in puzzle[coordx][coordy-6:coordy+1] and "║" not in puzzle[coordx][coordy-6:coordy+1] and "╗" not in puzzle[coordx][coordy-6:coordy+1] and "│" not in puzzle[coordx][coordy-6:coordy+1]:
            puzzle[coordx] = puzzle[coordx][:coordy-6] + "═══════" + puzzle[coordx][coordy+1:]
            coordy -= 6
        # when previous move was up, left side of current position should not have obstacle/boundary
        elif prev == 3 and puzzle[coordx][coordy - 6] != "║" and "│" not in puzzle[coordx][coordy - 6:coordy] and "╗" not in puzzle[coordx][coordy - 6:coordy]:
            puzzle[coordx] = puzzle[coordx][:coordy-6] + "══════╗" + puzzle[coordx][coordy+1:]
            coordy -= 6
        # when previous move was down, left side of current position should not have obstacle/boundary
        elif prev == 4 and puzzle[coordx][coordy - 6] != "║" and "│" not in puzzle[coordx][coordy - 6:coordy] and "╗" not in puzzle[coordx][coordy - 6:coordy]:
            puzzle[coordx] = puzzle[coordx][:coordy-6] + "══════╝" + puzzle[coordx][coordy+1:]
            coordy -= 6
        '''
        elif  puzzle[coordx][coordy-5:coordy+1] == "═════╝" or puzzle[coordx][coordy-5:coordy+1] == "═════╗":  # 3rd if
            puzzle[coordx] = puzzle[coordx][:coordy-5] + "      " + puzzle[coordx][coordy+1:]
            coordy -= 6
        elif puzzle[coordx][coordy-5:coordy+1] == "══════":
            puzzle[coordx] = puzzle[coordx][:coordy-5] + "      " + puzzle[coordx][coordy+1:]
            coordy -= 6
        '''
    if move == 2:  # right
        # At the start position and right side of current position should not have boundary
        if puzzle[coordx][coordy] == "●" and "│" not in puzzle[coordx][coordy]+puzzle[coordx][coordy+1]:
            puzzle[coordx] = puzzle[coordx][:coordy] + "●══════" + puzzle[coordx][coordy+7:]
            coordy += 6
        # to move left again when it has already moved right, right side of current position should not have obstacle/boundary
        elif "═ " in puzzle[coordx][coordy:coordy+7] and "║" not in puzzle[coordx][coordy:coordy+7] and "╔" not in puzzle[coordx][coordy:coordy+7] and "│" not in puzzle[coordx][coordy:coordy+7]:
            puzzle[coordx] = puzzle[coordx][:coordy] + "═══════" + puzzle[coordx][coordy+7:]
            coordy += 6
        # when previous move was up, right side of current position should not have obstacle/boundary
        elif prev == 3 and puzzle[coordx][coordy + 6] != "║" and "│" not in puzzle[coordx][coordy:coordy + 6] and "╔" not in puzzle[coordx][coordy:coordy + 6]:  # prev = up
            puzzle[coordx] = puzzle[coordx][:coordy] + "╔══════" + puzzle[coordx][coordy+7:]
            coordy += 6
        # when previous move was down, right side of current position should not have obstacle/boundary
        elif prev == 4 and puzzle[coordx][coordy + 6] != "║" and "│" not in puzzle[coordx][coordy:coordy + 6] and "╔" not in puzzle[coordx][coordy:coordy + 6]:  # prev = down
            puzzle[coordx] = puzzle[coordx][:coordy] + "╚══════" + puzzle[coordx][coordy+7:]
            coordy += 6
        '''
        elif puzzle[coordx][coordy:coordy+6] == "╔═════" or puzzle[coordx][coordy:coordy+6] == "╚═════":
            puzzle[coordx] = puzzle[coordx][:coordy] + "      " + puzzle[coordx][coordy + 6:]
            coordy += 6
        elif puzzle[coordx][coordy:coordy+6] == "══════":
            puzzle[coordx] = puzzle[coordx][:coordy] + "      " + puzzle[coordx][coordy+6:]
            coordy += 6
        '''

    if move == 3:  # up
        b = ["║  ", "║x ", "║ x"]
        c = ["═  ", "═x ", "═ x"]
        # At the start position and top side of current position should not have boundary
        if puzzle[coordx][coordy] == "●" and "─" not in puzzle[coordx][coordy]+puzzle[coordx-1][coordy] + puzzle[coordx-2][coordy]:
            puzzle[coordx - 1] = puzzle[coordx - 1][:coordy] + "║" + puzzle[coordx - 1][coordy+1:]
            puzzle[coordx - 2] = puzzle[coordx - 2][:coordy] + "║" + puzzle[coordx - 2][coordy+1:]
            coordx -= 2
        # to move up again, only allowing passing through empty space or key points 2 space above
        elif puzzle[coordx][coordy]+puzzle[coordx-1][coordy] + puzzle[coordx-2][coordy] in b:
            puzzle[coordx - 1] = puzzle[coordx - 1][:coordy] + "║" + puzzle[coordx - 1][coordy+1:]
            puzzle[coordx - 2] = puzzle[coordx - 2][:coordy] + "║" + puzzle[coordx - 2][coordy+1:]
            coordx -= 2
        # when previous move was left, only allowing passing through empty space or key points 2 space above
        elif puzzle[coordx][coordy]+puzzle[coordx-1][coordy]+puzzle[coordx-2][coordy] in c and prev == 1:  # left
            puzzle[coordx] = puzzle[coordx][:coordy] + "╚" + puzzle[coordx][coordy + 1:]
            puzzle[coordx - 1] = puzzle[coordx - 1][:coordy] + "║" + puzzle[coordx - 1][coordy+1:]
            puzzle[coordx - 2] = puzzle[coordx - 2][:coordy] + "║" + puzzle[coordx - 2][coordy+1:]
            coordx -= 2
        # when previous move was right, only allowing passing through empty space or key points 2 space above
        elif puzzle[coordx][coordy]+puzzle[coordx-1][coordy]+puzzle[coordx-2][coordy] in c and prev == 2:  # right
            puzzle[coordx] = puzzle[coordx][:coordy] + "╝" + puzzle[coordx][coordy + 1:]
            puzzle[coordx - 1] = puzzle[coordx - 1][:coordy] + "║" + puzzle[coordx - 1][coordy+1:]
            puzzle[coordx - 2] = puzzle[coordx - 2][:coordy] + "║" + puzzle[coordx - 2][coordy+1:]
            coordx -= 2
        '''
        elif puzzle[coordx][coordy] == "╚" or puzzle[coordx][coordy] == "╝":  2nd if
            puzzle[coordx] = puzzle[coordx][:coordy] + " " + puzzle[coordx][coordy + 1:]
            puzzle[coordx - 1] = puzzle[coordx - 1][:coordy] + " " + puzzle[coordx - 1][coordy + 1:]
            coordx -= 2 

        elif puzzle[coordx][coordy]+puzzle[coordx-1][coordy] == "║║":  # step back
            puzzle[coordx] = puzzle[coordx][:coordy] + " " + puzzle[coordx][coordy+1:]
            puzzle[coordx-1] = puzzle[coordx-1][:coordy] + " " + puzzle[coordx-1][coordy+1:]
            coordx -= 2
        '''

    if move == 4:  # down
        b = ["║  ", "║x ", "║ x"]
        c = ["═  ", "═x ", "═ x"]
        # At the start position and bottom side of current position should not have boundary
        if puzzle[coordx][coordy] == "●" and "─" not in puzzle[coordx][coordy] + puzzle[coordx+1][coordy] + puzzle[coordx+2][coordy]:
            puzzle[coordx + 1] = puzzle[coordx + 1][:coordy] + "║" + puzzle[coordx + 1][coordy + 1:]
            puzzle[coordx + 2] = puzzle[coordx + 2][:coordy] + "║" + puzzle[coordx + 2][coordy + 1:]
            coordx += 2
        # to move down again, only allowing passing through empty space or key points 2 space below
        elif puzzle[coordx][coordy] + puzzle[coordx + 1][coordy] + puzzle[coordx + 2][coordy] in b:
            puzzle[coordx + 1] = puzzle[coordx + 1][:coordy] + "║" + puzzle[coordx + 1][coordy + 1:]
            puzzle[coordx + 2] = puzzle[coordx + 2][:coordy] + "║" + puzzle[coordx + 2][coordy + 1:]
            coordx += 2
        # when previous move was left, only allowing passing through empty space or key points 2 space below
        elif puzzle[coordx][coordy]+puzzle[coordx+1][coordy] + puzzle[coordx+2][coordy] in c and prev == 1:  # prev = left
            puzzle[coordx] = puzzle[coordx][:coordy] + "╔" + puzzle[coordx][coordy + 1:]
            puzzle[coordx + 1] = puzzle[coordx + 1][:coordy] + "║" + puzzle[coordx + 1][coordy+1:]
            puzzle[coordx + 2] = puzzle[coordx + 2][:coordy] + "║" + puzzle[coordx + 2][coordy+1:]
            coordx += 2
        # when previous move was right, only allowing passing through empty space or key points 2 space below
        elif puzzle[coordx][coordy]+puzzle[coordx+1][coordy] + puzzle[coordx+2][coordy] in c and prev == 2:  # prev = right
            puzzle[coordx] = puzzle[coordx][:coordy] + "╗" + puzzle[coordx][coordy + 1:]
            puzzle[coordx + 1] = puzzle[coordx + 1][:coordy] + "║" + puzzle[coordx + 1][coordy+1:]
            puzzle[coordx + 2] = puzzle[coordx + 2][:coordy] + "║" + puzzle[coordx + 2][coordy+1:]
            coordx += 2
        '''
        elif puzzle[coordx][coordy] == "╔" or puzzle[coordx][coordy] == "╗":  # remove    # 2nd if
            puzzle[coordx] = puzzle[coordx][:coordy] + " " + puzzle[coordx][coordy + 1:]
            puzzle[coordx + 1] = puzzle[coordx + 1][:coordy] + " " + puzzle[coordx + 1][coordy + 1:]
            coordx += 2

        elif puzzle[coordx][coordy] + puzzle[coordx + 1][coordy] == "║║":  # step back remove
            puzzle[coordx] = puzzle[coordx][:coordy] + " " + puzzle[coordx][coordy + 1:]
            puzzle[coordx + 1] = puzzle[coordx + 1][:coordy] + " " + puzzle[coordx + 1][coordy + 1:]
            coordx += 2
        '''
    return puzzle


# load all puzzle from puzzlefiles into list
allpuzzle = [puzzle1, puzzle2, puzzle3, puzzle4, puzzle5, puzzle6, puzzle7, puzzle8, puzzle9, puzzle10]
inplay = True
while inplay:
    stage = -1
    os.system('cls')
    print("Stage: ", end="")
    for i in range(len(allpuzzle)):
        if i < len(allpuzzle)-1:
            print(i+1, end=", ")
        else:
            print(i + 1)
    print("Choose what stage you want to start")
    while stage < 0 or stage > len(allpuzzle):
        try:
            stage = int(input("Stage:"))-1
        except Exception as e:
            print("Error")
    while stage < len(allpuzzle):
        coordx = 0
        coordy = 0
        currpuzzle = allpuzzle[stage]
        base = currpuzzle.copy()  # save original puzzle to base for reset
        findxycoord(currpuzzle)
        prev = ""
        complete = False
        while not complete:
            os.system('cls')
            move = 0
            # printmap(base)
            printmap(currpuzzle)
            # print(coordx, coordy)
            print("1:Left 2:Right 3:Up 4:Down 5:Reset 6:Return to Main Menu")
            while move < 1 or move > 6:
                try:
                    move = int(input("Move: "))
                except Exception as e:
                    print("Error")
            if move == 5:  # reset to original
                currpuzzle = base.copy()
                findxycoord(currpuzzle)  # reset the xy coordinate of the current position
                pass
            if move == 6:
                allpuzzle[stage] = base.copy()  # reset the map before back to menu
                stage = len(allpuzzle)  # get out of complete loop
                os.system('cls')
                break
            before = currpuzzle.copy()  # for cross-check
            currpuzzle = update(move, currpuzzle, prev)
            if before != currpuzzle:  # if there is no valid move → no change in puzzle
                prev = move
            complete = check(currpuzzle)  # check if all target 'x' reached
        if complete:
            os.system('cls')
            printmap(currpuzzle)
            allpuzzle[stage] = base.copy()  # reset the map before back to menu
            stage += 1
            print("Well Done! Stage cleared")
            sleep(1)
