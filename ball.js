// CONSTRUCTOR
//define canvas
let myCanvas = HyperbolicCanvas.create('#hyperbolic-canvas');
let ctx= myCanvas.getContext('2d');

//set constants, initialise global variables
const DOT_SIZE = .03;
const SEG_SIZE = DOT_SIZE;
const START_LEN = 30;
const RADIUS = 2.44845244;
const SAFE_RADIUS = 1.5;
const GROWTH_FACTOR = 10;
let DELAY = 30;
let inGame = false;
const LEFT= 37;
const RIGHT= 39;
const SPACE = 32;
const START_DIRECTION = Math.PI/8;
const START_HEAD_POS = HyperbolicCanvas.Point.givenCoordinates(0,0);
let ball = {};
let START_HEAD ={
    position : START_HEAD_POS, 
    direction : START_DIRECTION
 };
let START_BODY = [START_HEAD.position];

//construct the octagon
let surface = HyperbolicCanvas.Polygon.givenHyperbolicNCenterRadius(8, HyperbolicCanvas.Point.CENTER, RADIUS);
//safeCircle is a circle which is stricly inside the octagon
let safeCircle = HyperbolicCanvas.Circle.givenHyperbolicCenterRadius(HyperbolicCanvas.Point.CENTER, SAFE_RADIUS);

//get the sides and the circles defining the boundary of the octagon
let sides = surface.getLines();
let sides_circles = [];
sides.forEach(line=>{
    let circle = line.getHyperbolicGeodesic();
    sides_circles.push(circle);
});
//get lines through the center to reflect
let reflect_lines = [];
for (let i=0; i<8;i++){
    let apo = HyperbolicCanvas.Line.givenAnglesOfIdealPoints(
        Math.PI/8+i*Math.PI/4, HyperbolicCanvas.Angle.opposite(Math.PI/8+i*Math.PI/4) 
        );
    reflect_lines.push(apo);
};
console.log(reflect_lines)

//define the gluing sides
function gluing_rules(exit){
    switch(exit){
        case 0:return 6;
        case 1:return 7;
        case 2:return 4;
        case 3:return 5;
        case 4:return 2;
        case 5:return 3;
        case 6:return 0;
        case 7:return 1;

        // case 0:return 3;
        // case 1:return 4;
        // case 2:return 5;
        // case 3:return 0;
        // case 4:return 1;
        // case 5:return 2;
    }
}

function reflIndex(exit){
    switch(exit){
        case 0:return 7;
        case 1:return 0;
        case 2:return 3;
        case 3:return 4;
        case 4:return 3;
        case 5:return 4;
        case 6:return 7;
        case 7:return 0;
    }
}

// color the gluing sides
function colorSides(){
    let color1 = 'red';
    let color2 = 'green';
    let color3 = 'blue';
    let color4 = 'purple';
    let color = 'white';
    for (let i =0; i<8; i++){
        switch(i){
            case (0): { color =color1; break;}
            case (1): { color =color2; break;}
            case (2): { color =color3; break;}
            case (3): { color =color4; break;}
            case (4): { color =color3; break;}
            case (5): { color =color4; break;}
            case (6): { color =color1; break;}
            case (7): { color =color2; break;}

            // case (0): { color =color1; break;}
            // case (1): { color =color2; break;}
            // case (2): { color =color3; break;}
            // case (3): { color =color1; break;}
            // case (4): { color =color2; break;}
            // case (5): { color =color3; break;}
        }
        let path = myCanvas.pathForHyperbolic(sides[i]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        myCanvas.stroke(path);
    }
    // for (let i =0; i<8; i++){
    //     let p = surface.getVertices()[i];
    //     let path = myCanvas.pathForHyperbolic(
    //         HyperbolicCanvas.Circle.givenHyperbolicCenterRadius(p, DOT_SIZE*4));
    //     myCanvas.fill(path);
    // }
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

// BALL MOVEMENTS

//snake functions
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
    // snake.body.forEach(node => {
        let path = myCanvas.pathForHyperbolic(
            HyperbolicCanvas.Circle.givenHyperbolicCenterRadius(ball.body[0], DOT_SIZE));
        myCanvas.fill(path);    
    // });
}

function new_ball(ball, dir, p){
    dir = HyperbolicCanvas.Angle.normalize(dir);
    ball.instruction.position = p;
    ball.instruction.direction = dir;
    ball.steps_from_instr = 0;
}

//turn in straight angles
function turn(ball, str){
    let newHead = ball.instruction.position.hyperbolicDistantPoint(
        SEG_SIZE*(ball.steps_from_instr+1),
        ball.instruction.direction);
    let dir = angleGivenPoints(newHead, ball.body[0]);
    switch(str){
        case 'left': {dir += Math.PI/2;
        break;
        }
        case 'right':{dir-= Math.PI/2;
        break;
        }
        default: break;
    }
    new_ball(ball, dir, ball.body[0]);
    move(ball);
}

//main move function, takes care of transitions at octagon sides
function move_ball(ball){
    let newHead = ball.instruction.position.hyperbolicDistantPoint(
        SEG_SIZE*(ball.steps_from_instr+1),
        ball.instruction.direction);
    ball.steps_from_instr++;
    let exitIndex = null;
    if (!safeCircle.containsPoint(newHead)){
        for (let i = 0; i< 8;i++){
            if (sides_circles[i].containsPoint(newHead)){
                exitIndex = i;
                break;
            }
        }
        if (exitIndex!=null){
            let transNewHead = reflect(ball.body[0],reflect_lines[reflIndex(exitIndex)]);
            let ausil = reflect(newHead,reflect_lines[reflIndex(exitIndex)]);
            let m=-1/HyperbolicCanvas.Angle.toSlope(sides_circles[gluing_rules(exitIndex)].euclideanAngleAt(transNewHead));
            let p2 = HyperbolicCanvas.Point.givenCoordinates(1/10+transNewHead.getX(),m/10+transNewHead.getY());
            let newNewHead = reflect2(ausil, transNewHead,p2);
            let newAngle = HyperbolicCanvas.Angle.normalize(angleGivenPoints(newNewHead,transNewHead));
            new_ball(ball,newAngle,transNewHead);
            newHead = transNewHead;
        }
    };
    ball.body.unshift(newHead);
    if (ball.growing>0){
        ball.growing--;
    }
    else{
        ball.body.pop();
    }   
}

//move the ball
function move(ball){
    move_ball(ball);
    draw_ball(ball);
}

//listeners for turning
var pressed = false;
document.addEventListener('keydown', function(key){
    if (!pressed && inGame){
        switch(key.which){
        case LEFT: {
            pressed = true;
            turn(ball,'left');
            break;
            }
        case RIGHT: {
            pressed = true;
            turn(ball,'right');
            break;
        }
    }   
    }     
})

//prevent repeat events if key is held down
document.addEventListener('keyup', function(key){
    if (key.which === LEFT || key.which === RIGHT && inGame){
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
    move(ball);
    setTimeout(function(){requestAnimationFrame(render);},DELAY);
  };

// Main
startGame()
