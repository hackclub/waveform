// -- audio processing --

//@ts-ignore
window.AudioContext = window.AudioContext || window.webkitAudioContext;

const audioContext = new AudioContext();

const decodeAudio = async (url: string) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
};

const songs = [
    {
        name: 'around the world',
        author: 'daft punk',
        url: './public/world.mp3',
        threshold: 0.4
    },
    {
        name: 'song2',
        author: 'ascpixi',
        url: './public/song2.mp3',
        threshold: 0.3
    },
    {
        name: 'LIKE THIS',
        author: 'atura',
        url: './public/song3.mp3',
        threshold: 0.4,
        activeThresh: 0.6
    },
    {
        name: 'slip',
        author: 'geographer',
        url: './public/slip.mp3',
        threshold: 0.35
    }
]

const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const data = new Uint8Array(analyser.frequencyBinCount);

// filter
const lowpass = audioContext.createBiquadFilter();
lowpass.type = "highpass";
lowpass.frequency.value = 40;
lowpass.Q.value = 0.7;

const peaking = audioContext.createBiquadFilter();
peaking.type = "peaking";
peaking.gain.value = 6;
peaking.Q.value = 1;

// order matters!!!!
lowpass.connect(peaking);
peaking.connect(analyser);

// -- audio state manager
let source = audioContext.createBufferSource();
let sourceState = 'notstarted' as 'notstarted' | 'loading' | 'started' | 'stopped';
let songIndex = 2;

async function loadSource() {
    source = audioContext.createBufferSource();

    sourceState = 'loading';

    source.buffer = await decodeAudio(songs[songIndex].url);
    THRESHOLD = songs[songIndex].threshold;
    source.connect(lowpass);
    source.connect(audioContext.destination);
    source.loop = true;

    sourceState = 'notstarted';
}

function startSource() {
    if (sourceState === 'notstarted') {
        source.start();
        sourceState = 'started';
    }
}

function stopSource() {
    if (sourceState === 'started') {
        source.stop();
        sourceState = 'stopped';
    }
}

async function playSong() {
    await audioContext.resume();
    startSource();
}

async function pauseSong() {
    // stopSource();
    await audioContext.suspend();
}

let lock = false;
async function nextSong(increment: number) {
    if (lock) return;
    lock = true;

    if (songIndex + increment < 0) increment = songs.length - 1;
    songIndex = (songIndex + increment) % songs.length;

    switch (sourceState) {
        case 'started':
            stopSource();
        /* FALLTHROUGH */
        case 'notstarted':
        case 'stopped':
        case 'loading':
            await loadSource();
            startSource();
            break;
    }

    // if (songIndex == 2) {
    //     const oldfooter = footer.innerHTML;
    //     footer.innerHTML = "this one is my favorite :3";
    //     setTimeout(() => {
    //         footer.innerHTML = oldfooter;
    //     }, 5000);
    // }

    lock = false;
}

let muted = false;
function mute() {
    muted = true;
    // disconnect analyser from destination
    if (source.disconnect) {
        source.disconnect(audioContext.destination);
    }
}

function unmute() {
    muted = false;
    // reconnect analyser to destination
    source.connect(audioContext.destination);
}



// -- canvas visualizer --
import { gsap } from "gsap";

const startNow = document.getElementById('start')!;

const canvas = document.getElementById('waveform') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let active = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let mostRecentId = 0;
const waveforms = [
    {
        angle: 0,
        color: 0,
        scale: 1,
        id: mostRecentId,
    }
]

let THRESHOLD = 0.4;
const MAX_WAVEFORMS = 1500;
const OUT_OF_BOUNDS_SCALE = 30;

let MAenergyValues = [] as number[];

let c = 0;

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

let fastMode = false;
function draw() {
    ctx.save();

    analyser.getByteTimeDomainData(data);

    let energy = 0;
    for (let i = 0; i < data.length; i++) {
        const sample = (data[i] - 128) / 128; // normalize
        energy += sample * sample; //rms
    }
    const rms = Math.sqrt(energy / data.length);

    MAenergyValues.push(rms);
    if (MAenergyValues.length > 20) {
        MAenergyValues.shift();
    }

    const averageRMS = MAenergyValues.reduce((a, b) => a + b, 0) / MAenergyValues.length;

    if (!fastMode && songs[songIndex].activeThresh && rms > songs[songIndex].activeThresh!) {
        fastMode = true;
        setTimeout(() => { fastMode = false }, 1250);
    }

    if (rms > THRESHOLD && waveforms.length < MAX_WAVEFORMS) {
        waveforms.push({
            angle: 0,
            color: fastMode ? c : Math.random() * 360,
            scale: 1,
            id: ++mostRecentId,
        });
    }

    if (waveforms.length > MAX_WAVEFORMS) { console.log("reached max waveforms") }

    for (const waveform of waveforms) {
        ctx.save();

        const speed = 2;

        ctx.translate(canvas.width / 2, canvas.height / 2);

        ctx.rotate(
            (mostRecentId == waveform.id ?
                0 :
                waveform.angle + averageRMS * speed / 4)
        );

        const scale = mostRecentId == waveform.id ? 1 : waveform.scale;
        ctx.scale(scale + averageRMS * speed, scale + averageRMS * speed);

        ctx.fillStyle = mostRecentId == waveform.id ?
            `white` :
            `hsl(${waveform.color * 2}, 100%, 70%)`;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "48px Audiowide";

        if (mostRecentId == waveform.id) {
            ctx.strokeStyle = "black";
            ctx.lineWidth = 12;
            ctx.strokeText("waveform", 0, 0);
        }

        ctx.fillText("waveform", 0, 0);

        if (active) {
            waveform.angle += fastMode ? 0.04 : 0.02;
            waveform.scale += fastMode ? 0.05 : 0.01;
            waveform.color += fastMode ? 0.1 : 0.05;
        }

        // remove waveform if it's out of bounds
        if (waveform.scale > OUT_OF_BOUNDS_SCALE) {
            waveforms.splice(waveforms.indexOf(waveform), 1);
        }

        if (fastMode && waveform.angle > Math.PI * 4) {
            console.log("removed waveform in fast mode");
            waveforms.splice(waveforms.indexOf(waveform), 1);
        }

        ctx.restore();
    }

    c++;
    document.querySelectorAll('.rainbow').forEach((element, key) => {
        (element as HTMLElement).style.color = `hsl(${c * 4 + key * 100}, 70%, 70%)`;
    });
    document.querySelectorAll('.rainbowbg').forEach((element, key) => {
        (element as HTMLElement).style.background = `hsl(${c * 6 + key * 100}, 70%, 70%)`;
    });

    requestAnimationFrame(draw);
}

draw();

canvas.style.cursor = 'pointer';

loadSource().then(() => {
    const overlay = document.getElementById('overlay')!;
    overlay.style.display = 'none';
});

const footer = document.getElementById('footer')!;
let defaultFooter = footer.innerHTML;

canvas.onclick = async () => {
    if (active) return;
    canvas.style.cursor = 'default';

    gsap.to('#overlay2', {
        opacity: 0,
        display: 'none',
        duration: 0.5,
        ease: "power2.inOut",
    });

    for (let i = 0; i < 6; i++) {
        waveforms.push({
            angle: 0,
            color: Math.random() * 360,
            scale: 1 + i * 0.1,
            id: ++mostRecentId,
        });

        gsap.to(waveforms[i - 1], {
            scale: 2,
            angle: Math.PI * i / 3,

            duration: 1,
            ease: "power2.inOut",
        });
    }

    setTimeout(async () => {
        await startSource();
        active = true;
    }, 100);

    gsap.to('#content', {
        opacity: 1,
        visibility: 'visible',
        height: 'auto',

        delay: 1,
        duration: 1,
        ease: "power2.inOut",
    }).then(() => {
        gsap.to('#content :not(#gallery .gallery-img)', {
            opacity: 1,

            duration: 1,
            ease: "power2.inOut",
        });

        gsap.to('#mute, #hide', {
            opacity: 1,
            visibility: 'visible',

            duration: 1,
            ease: "power2.inOut",
        });

        gsap.to('#gallery', {
            display: 'flex',
            height: '100px',
            opacity: 1,

            delay: 10,
            duration: 1,
            ease: "power2.inOut",
        }).then(() => {
            defaultFooter = 'check out these sick visualizers made by hackclubbers like you!';
            footer.innerHTML = defaultFooter;

            gsap.to('.gallery-img', {
                opacity: 1,
                duration: 1,
                ease: "power2.inOut",
            });
        });
    });
};

const muteButton = document.getElementById('mute')!;

muteButton.onclick = () => {
    if (muted) {
        unmute();
        muteButton.innerHTML = 'mute';
    }
    else {
        mute();
        muteButton.innerHTML = 'unmute';
    }
}

const hideButton = document.getElementById('hide')!;
let hidden = false;

hideButton.onclick = () => {
    if (hidden) {
        document.querySelectorAll('#gallery, .gallery-img').forEach((element) => {
            (element as HTMLElement).style.opacity = '0';
        });

        gsap.to('#content', {
            opacity: 1,
            visibility: 'visible',
            height: 'auto',
            padding: '16px 0px',

            duration: 1, 
            ease: "power2.inOut",
        }).then(() => {
            gsap.fromTo('#content *, #gallery, .gallery-img', {
                opacity: 0,
            }, {
                opacity: 1,

                duration: 1,
                ease: "power2.inOut",
            });
        });
        
        hideButton.innerHTML = 'hide';
    }
    else {
        gsap.to('#content *, .gallery-img', {
            opacity: 0,
            
            duration: 1,
            ease: "power2.inOut",
        }).then(() => {
            gsap.to('#content', {
                height: '0px',
                padding: '0px',
                
                duration: 1,
                ease: "power2.inOut",
            }).then(() => {
                document.getElementById('content')!.style.visibility = 'hidden';
            });
        });

        hideButton.innerHTML = 'show';
    }
    
    hidden = !hidden;
};


// const reset = (button: HTMLElement) => {
//     return () => {
//         footer.innerHTML = defaultFooter;
//         button.classList.remove('rainbowbg');
//         button.style.background = 'black';
//     }
// };

// const signup = document.getElementById('signup')!;
// signup.onmouseenter = (button) => {
//     signup.classList.add('rainbowbg');
//     footer.innerHTML = "join the #waveform slack channel."
// };

// const tutorial = document.getElementById('tutorial')!;
// tutorial.onmouseenter = () => {
//     tutorial.classList.add('rainbowbg');
//     footer.innerHTML = "want to build a visualizer? here's a quick tutorial for ya";
// };

// const submit = document.getElementById('submit')!;
// submit.onmouseenter = async () => {
//     submit.classList.add('rainbowbg');
//     footer.innerHTML = "ready to submit? i can't wait ^.^";
// };

// signup.onmouseleave = reset(signup);
// tutorial.onmouseleave = reset(tutorial);
// submit.onmouseleave = reset(submit);

// prevent FOUC
window.onload = () => {
    document.body.style.visibility = 'visible';
};