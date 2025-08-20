const song2 = './public/song2.mp3';
const atw = './public/world.mp3';
const slip = './public/slip.mp3';

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
        url: atw,
        threshold: 0.4
    },
    {
        name: 'song2',
        author: 'ascpixi',
        url: song2,
        threshold: 0.3
    },
    {
        name: 'slip',
        author: 'geographer',
        url: slip,
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

// -- canvas visualizer --
const canvas = document.getElementById('waveform') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let mostRecentId = 0;
const waveforms = [
    {
        angle: 0,
        color: 0,
        scale: 0,
        id: mostRecentId
    }
]

let THRESHOLD = 0.4;
const MAX_WAVEFORMS = 1500;
const OUT_OF_BOUNDS_SCALE = 30;

let MAenergyValues = [] as number[];

const controlPane = document.querySelector('.control-pane') as HTMLElement;
const controller = document.getElementById('controller') as HTMLElement;
const controlData = document.getElementById('control-data') as HTMLElement;

let songIndex = 1;
let playerState = 'notplaying' as 'notplaying' | 'playing' | 'paused';
let c = 0;

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

    if (rms > THRESHOLD && waveforms.length < MAX_WAVEFORMS) {
        waveforms.push({
            angle: 0,
            color: Math.random() * 360,
            scale: 1,
            id: ++mostRecentId
        });
    }

    if (waveforms.length > MAX_WAVEFORMS) { console.log("reached max waveforms") }

    for (const waveform of waveforms) {
        ctx.save();

        ctx.translate(canvas.width / 2, canvas.height / 2);

        ctx.rotate(
            mostRecentId == waveform.id ?
                0 :
                waveform.angle + averageRMS / 2
        );

        const scale = mostRecentId == waveform.id ? 1 : waveform.scale;
        ctx.scale(scale + averageRMS * 2, scale + averageRMS * 2);


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

        if (playerState === 'playing') {
            waveform.angle += 0.01;
            waveform.scale += 0.01;
            waveform.color += 0.05;
        }

        // remove waveform if it's reached a full loop
        if (waveform.scale > OUT_OF_BOUNDS_SCALE) {
            waveforms.splice(waveforms.indexOf(waveform), 1);
        }

        ctx.restore();
    }

    c++;
    document.querySelectorAll('.hover').forEach((element) => {
        (element as HTMLElement).style.color = `hsl(${c}, 70%, 70%)`;
    });
    document.querySelectorAll('.menu-item').forEach((element) => {
        (element as HTMLElement).style.borderColor = `hsl(${c}, 70%, 70%)`;
    });

    if (playerState === 'playing') {
        controlPane.style.backgroundColor = `hsl(${c}, 70%, 70%)`;
        controlData.style.color = 'black';
    } else {
        controlPane.style.backgroundColor = `black`;
    }

    requestAnimationFrame(draw);
}

draw();

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

// -- controls
let source = audioContext.createBufferSource();

async function setSource() {
    source = audioContext.createBufferSource();

    if (playerState === 'playing') {
        controlData.innerHTML = `loading...`;
    }

    source.buffer = await decodeAudio(songs[songIndex].url);
    THRESHOLD = songs[songIndex].threshold;
    source.connect(lowpass);
    source.connect(audioContext.destination);
    source.loop = true;
}

setSource();

function playSong() {
    audioContext.resume().then(async () => {
        if (playerState === 'notplaying') {
            source.start();
        }
        playerState = 'playing';
    });
    controlData.innerHTML = `playing <i>${songs[songIndex].name}</i><br>by ${songs[songIndex].author}`;
}

function pauseSong() {
    playerState = 'paused';
    audioContext.suspend();
}

async function nextSong(increment: number) {
    if (songIndex + increment < 0) increment = songs.length - 1;
    songIndex = (songIndex + increment) % songs.length;

    if (playerState === 'playing') {
        try {
            source.stop();
        } catch (error) {
            // eh wtvr
        }
        await setSource();
        source.start();
    }
    controlData.innerHTML = `playing <i>${songs[songIndex].name}</i><br>by ${songs[songIndex].author}`;
}

(document.querySelector('.next') as HTMLElement)!.onclick = () => {
    nextSong(1);
};

(document.querySelector('.prev') as HTMLElement)!.onclick = () => {
    nextSong(-1);
};

// -- interactivity

const applyHoverable = (element: HTMLElement) => {
    element.onmouseover = () => {
        element.classList.add('hover');
    };
    element.onmouseout = () => {
        element.classList.remove('hover');
        element.style.color = `white`;
    };
};

document.querySelectorAll('.hoverable').forEach((element) => {
    applyHoverable(element as HTMLElement);
});

const hideControls = () => {
    document.querySelectorAll('.control').forEach((element) => {
        (element as HTMLElement).style.visibility = 'hidden';
    });
};

const showControls = () => {
    document.querySelectorAll('.control').forEach((element) => {
        (element as HTMLElement).style.visibility = 'visible';
    });
};

hideControls();

let enterDebounce = false;
let leaveDebounce = false;
controller.onmouseenter = () => {
    if (enterDebounce) return;
    enterDebounce = true;

    if (playerState === 'playing') {
        controlData.innerHTML = `pause?`;
    } else {
        controlData.classList.add('hover');
    }

    setTimeout(() => {
        enterDebounce = false;
    }, 100);
};

controller.onmouseleave = () => {
    if (leaveDebounce) return;
    leaveDebounce = true;

    if (playerState === 'playing') {
        controlData.innerHTML = `playing <i>${songs[songIndex].name}</i><br>by ${songs[songIndex].author}`;
    } else {
        controlData.classList.remove('hover');
        controlData.style.color = `white`;
    }

    setTimeout(() => {
        leaveDebounce = false;
    }, 100);
};

controller.onclick = () => {
    if (playerState === 'notplaying' || playerState === 'paused') {
        playSong();
        showControls();
    } else {
        pauseSong();
        hideControls();
        controlData.innerHTML = `resume visualizer<br>(music & rapid visuals)`;
    }
};

// -- submit --
let debounce = false;
document.getElementById('submit')!.onclick = () => {
    if (debounce) return;
    debounce = true;

    const tagline = document.getElementById('tagline')!;
    tagline.innerHTML = 'submission form unlocks<br>at 100 members';

    tagline.style.transition = 'none';
    tagline.style.color = 'red';

    setTimeout(() => {
        tagline.style.transition = 'color 1s';
        tagline.style.color = 'white';
        setTimeout(() => {
            tagline.innerHTML = 'build an audio visualizer<br>get a music subscription';
        }, 2000);
        debounce = false;
    }, 100);
}

window.onload = () => {
    document.body.style.visibility = 'visible';
};
