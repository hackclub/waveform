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

// -- hint --
const footer = document.getElementById('footer-text')!;
setTimeout(() => {
    footer.innerHTML = 'did you know? this site took 15 hours to build!';
}, 10000);

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

// --- controls ---
const controller = document.getElementById('controller') as HTMLElement;
const prev = document.getElementById('prev') as HTMLElement;
const next = document.getElementById('next') as HTMLElement;

const infoHover = document.getElementById('info-hover-box') as HTMLElement;
const info = document.getElementById('info') as HTMLElement;
let infoText = info.innerHTML;
let infoTextHover = '';
const refresh = () => { info.innerHTML = infoText; };
const updateText = (text: string, hoverText = '') => {
    infoText = text;
    infoTextHover = hoverText;
    refresh();
};
let active = false;

let enterDebounce = false;
infoHover.onmouseenter = () => {
    if (enterDebounce) return;
    enterDebounce = true;

    if (infoTextHover) {
        info.innerHTML = infoTextHover;
    }

    if (!active) {
        info.classList.add('hover');
    }

    setTimeout(() => {
        enterDebounce = false;
    }, 100);
};

let leaveDebounce = false;
infoHover.onmouseleave = () => {
    if (leaveDebounce) return;
    leaveDebounce = true;

    info.innerHTML = infoText;

    if (!active) {
        info.classList.remove('hover');
        info.style.color = `white`;
    }

    setTimeout(() => {
        leaveDebounce = false;
    }, 100);
};

// prev/next controls
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

// functionality

next.onclick = async () => {
    updateText(`loading...`);
    await nextSong(1);
    updateText(`playing <i>${songs[songIndex].name}</i><br>by ${songs[songIndex].author}`, `pause?`);
};

prev.onclick = async () => {
    updateText(`loading...`);
    await nextSong(-1);
    updateText(`playing <i>${songs[songIndex].name}</i><br>by ${songs[songIndex].author}`, `pause?`);
};

const activate = async () => {
    if (!active) {
        updateText(`loading...`);

        await playSong();
        showControls();
        active = true;

        updateText(`playing <i>${songs[songIndex].name}</i><br>by ${songs[songIndex].author}`, `pause?`);
    } else {
        active = false;
        info.style.color = 'white';
        await pauseSong();
        hideControls();
        updateText(`resume visualizer<br>(music & rapid visuals)`);
    }
};
info.onclick = activate;

// -- color hover effect
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

// -- submit --
let debounce = false;
document.getElementById('submit')!.onclick = () => {
    if (debounce) return;
    debounce = true;

    const tagline = document.getElementById('tagline')!;
    tagline.innerHTML = 'submission form unlocks<br>at 100 members or aug 23rd';

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

// -- show/hide visuals --
const overlay = document.getElementById('overlay')!;
document.getElementById('show-vis')!.onclick = async () => {
    overlay.style.visibility = 'hidden';
    await loadSource();
    await activate();
};

document.getElementById('hide-vis')!.onclick = () => {
    loadSource();
    overlay.style.visibility = 'hidden';
};

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
            waveform.angle += fastMode ? 0.025 : 0.01;
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
    document.querySelectorAll('.hover').forEach((element) => {
        (element as HTMLElement).style.color = `hsl(${c}, 70%, 70%)`;
    });
    document.querySelectorAll('.menu-item').forEach((element) => {
        (element as HTMLElement).style.borderColor = `hsl(${c}, 70%, 70%)`;
    });

    if (active) {
        controller.style.backgroundColor = `hsl(${c}, 70%, 70%)`;
        info.style.color = 'black';
    } else {
        controller.style.backgroundColor = `black`;
    }

    requestAnimationFrame(draw);
}

draw();

// prevent FOUC

window.onload = () => {
    document.body.style.visibility = 'visible';
};