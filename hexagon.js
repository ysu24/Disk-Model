// CONSTRUCTOR

// Setting up the Hyperbolic canvas and its context
let myCanvas = HyperbolicCanvas.create('#hyperbolic-canvas');
let ctx= myCanvas.getContext('2d');

// Global Constants & Variables Initialization
const DOT_SIZE = .05;                  // Size of the dots in the canvas
const SEG_SIZE = DOT_SIZE;             // Segment size 
const START_LEN = 30;                  // Initial length of the ball
const RADIUS = 2.44845244;             // Radius of the main shape
const SAFE_RADIUS = 1.6;               // Radius inside which the ball is safe
const GROWTH_FACTOR = 10;              // Ball growth rate
let DELAY = 30;                        // Delay for rendering in the game loop
let inGame = false;                    // Game status (running or not)
const LEFT = 37;                       // KeyCode for left arrow
const RIGHT = 39;                      // KeyCode for right arrow
const SPACE = 32;                      // KeyCode for space
const START_DIRECTION = Math.PI/8;     // Starting direction of the ball
const START_HEAD_POS = HyperbolicCanvas.Point.givenCoordinates(0,0); // Starting position of the ball
let START_HEAD = {                     // Object defining starting head of the ball
    position : START_HEAD_POS, 
    direction : START_DIRECTION
};
let START_BODY = [START_HEAD.position]; // Array containing the ball's initial body positions

// Constructing the initial state of the ball
let ball = {
    position: START_HEAD_POS,
    direction: START_DIRECTION
};

// Creating an hexagon in hyperbolic space
let surface = HyperbolicCanvas.Polygon.givenHyperbolicNCenterRadius(6, HyperbolicCanvas.Point.CENTER, RADIUS);

// Creating a circle strictly inside the octagon - this is a safe zone for the ball
let safeCircle = HyperbolicCanvas.Circle.givenHyperbolicCenterRadius(HyperbolicCanvas.Point.CENTER, SAFE_RADIUS);

// Constructing the sides and boundary circles of the octagon
let sides = surface.getLines(); // Lines that form the octagon
let sides_circles = [];
sides.forEach(line=>{
    let circle = line.getHyperbolicGeodesic();
    sides_circles.push(circle);
});

// Creating reflection lines through the center of the canvas
let reflect_lines = [];
for (let i=0; i<6; i++){
    let apo = HyperbolicCanvas.Line.givenAnglesOfIdealPoints(
        Math.PI/6+i*Math.PI/3, HyperbolicCanvas.Angle.opposite(Math.PI/6+i*Math.PI/3) 
        );
    reflect_lines.push(apo);
}


//define the gluing sides
function gluing_rules(exit){
    switch(exit){
        case 0: return 4;
        case 1: return 5;
        case 2: return 0;
        case 3: return 1;
        case 4: return 2;
        case 5: return 3;
    }
}


function reflIndex(exit){
    switch(exit){
        case 0: return 5;
        case 1: return 0;
        case 2: return 1;
        case 3: return 2;
        case 4: return 3;
        case 5: return 4;
    }
}


// color the gluing sides
function colorSides(){
    let color1 = 'red';
    let color2 = 'green';
    let color3 = 'blue';
    let color = 'white';
    for (let i =0; i<6; i++){
        switch(i){
            case (0): { color =color1; break;}
            case (1): { color =color2; break;}
            case (2): { color =color3; break;}
            case (3): { color =color1; break;}
            case (4): { color =color2; break;}
            case (5): { color =color3; break;}
        }
        let path = myCanvas.pathForHyperbolic(sides[i]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        myCanvas.stroke(path);
    }
}


//define geometric functions
//reflection of a point through a line going through 0
function reflect(p, l){
    let relAngle = p.getAngle()-HyperbolicCanvas.Angle.fromSlope(l.getSlope());
    let newP = HyperbolicCanvas.Point.givenEuclideanPolarCoordinates(
        p.getEuclideanRadius(),
        p.getAngle() -2*relAngle
    );
    return newP;
}

//reflection of a point through the line going through p1, p2
function reflect2(point, p1, p2){
    let m = (p1.getY()-p2.getY())/(p1.getX()-p2.getX());
    let slope = m!=0 ? -1/m : HyperbolicCanvas.INFINITY;
    let norm = [1/Math.sqrt((1+Math.pow(slope,2))), slope/Math.sqrt((1+Math.pow(slope,2)))];
    let c = norm[0]*p1.getX() + norm[1]*p1.getY();
    //equation of the line is now norm.x=c
    let scal = point.getX()*norm[0]+point.getY()*norm[1];
    let newX = point.getX()- 2*(scal-c)*norm[0];
    let newY = point.getY()- 2*(scal-c)*norm[1];
    return HyperbolicCanvas.Point.givenCoordinates(newX,newY);
}

function angleGivenPoints(a,b){
    let vect= [a.getX()-b.getX(), a.getY()-b.getY()];
    let slope = (vect[0] !=0) ? vect[1]/vect[0] :HyperbolicCanvas.INFINITY;
    return (vect[0]>=0) ? Math.atan(slope) : Math.atan(slope)+Math.PI;    
}


//draw surface

function drawSurface(){
    ctx.fillStyle = 'black'
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    let path = myCanvas.pathForHyperbolic(surface);
    myCanvas.stroke(path);
    let path1 = myCanvas.pathForHyperbolic(
        HyperbolicCanvas.Circle.givenHyperbolicCenterRadius(HyperbolicCanvas.Point.CENTER, RADIUS));
    myCanvas.stroke(path1);
    colorSides();
}


// BALL MOVEMENTS
function initialize_ball(ball){
    START_HEAD.position = START_HEAD_POS;
    START_HEAD.direction = START_DIRECTION;
    START_BODY = [START_HEAD.position];
    for (let i = 0; i<START_LEN-1; i++){
        START_BODY.push(START_BODY[0].hyperbolicDistantPoint(SEG_SIZE*(i+1), HyperbolicCanvas.Angle.opposite(START_HEAD.direction)));
     };    
    ball.body = START_BODY;
    ball.instruction = START_HEAD;
    ball.steps_from_instr = 0;
    ball.growing = 0;
}

function draw_ball(ball){
    myCanvas.setContextProperties({ fillStyle: 'black' });
    let path = myCanvas.pathForHyperbolic(
        HyperbolicCanvas.Circle.givenHyperbolicCenterRadius(ball.position, DOT_SIZE));
    myCanvas.fill(path);
}

function new_ball(ball, dir, p){
    dir = HyperbolicCanvas.Angle.normalize(dir);
    ball.instruction.position = p;
    ball.instruction.direction = dir;
    ball.steps_from_instr = 0;
}

//turn in straight angles
function turn(ball, str){
    let dir = ball.direction;
    switch(str){
        case 'left': {
            dir += Math.PI/2;
            break;
        }
        case 'right': {
            dir -= Math.PI/2;
            break;
        }
        default: break;
    }
    ball.direction = HyperbolicCanvas.Angle.normalize(dir);
    move_ball(ball);
}

function move_ball(ball){
    let newHead = ball.position.hyperbolicDistantPoint(
        SEG_SIZE,
        ball.direction);
    
    let exitIndex = null;
    if (!safeCircle.containsPoint(newHead)){
        for (let i = 0; i< 8; i++){
            if (sides_circles[i].containsPoint(newHead)){
                exitIndex = i;
                break;
            }
        }
        if (exitIndex !== null){
            let transNewHead = reflect(ball.position, reflect_lines[reflIndex(exitIndex)]);
            let ausil = reflect(newHead, reflect_lines[reflIndex(exitIndex)]);
            let m = -1/HyperbolicCanvas.Angle.toSlope(sides_circles[gluing_rules(exitIndex)].euclideanAngleAt(transNewHead));
            let p2 = HyperbolicCanvas.Point.givenCoordinates(1/10 + transNewHead.getX(), m/10 + transNewHead.getY());
            let newNewHead = reflect2(ausil, transNewHead, p2);
            ball.position = transNewHead;
            ball.direction = HyperbolicCanvas.Angle.normalize(angleGivenPoints(newNewHead, transNewHead));
        } else {
            ball.position = newHead;
        }
    } else {
        ball.position = newHead;
    }

    draw_ball(ball);
}


//listeners for turning
var pressed = false;
document.addEventListener('keydown', function(key){
    if (!pressed && inGame){
        switch(key.code){
        case 'ArrowLeft': {
            pressed = true;
            turn(ball,'left');
            break;
            }
        case 'ArrowRight': {
            pressed = true;
            turn(ball,'right');
            break;
        }
    }   
    }     
})

//prevent repeat events if key is held down
document.addEventListener('keyup', function(key){
    if ((key.code === 'ArrowLeft' || key.code === 'ArrowRight') && inGame){
        pressed = false;
    }
})


//game functions
function startGame(){
    init();
    render();
}

//initial scene
function init(){
    inGame = true;
    drawSurface();
    initialize_ball(ball);
    draw_ball(ball);
}

//game loop
function render() {
    myCanvas.clear();
    drawSurface();
    move_ball(ball);
    setTimeout(function(){requestAnimationFrame(render);},DELAY);
  };

// Main
startGame()
