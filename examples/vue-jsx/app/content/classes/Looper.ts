import { Abloop } from "app/types/type";

// 将 "MM:SS" 或 "HH:MM:SS" 的时间格式转换为秒
function timeStringToSeconds(timeString: string) {
    const parts = timeString.split(":").map(Number).reverse();
    let seconds = 0;

    if (parts.length >= 1) seconds += parts[0]; // 秒
    if (parts.length >= 2) seconds += parts[1] * 60; // 分钟
    if (parts.length >= 3) seconds += parts[2] * 3600; // 小时

    return seconds;
}

export default class Looper {
    eventCallback: Function | null = null;
    constructor() {}

    udpateLoop(video: HTMLVideoElement, abLoop: Abloop) {
        if (abLoop.on === false) return;

        if (abLoop.a !== null && abLoop.b !== null) {
            const time = timeStringToSeconds(abLoop.b);
            if (video.currentTime >= time) {
                video.currentTime = timeStringToSeconds(abLoop.a);
                video.play();
            }
        }
    }

    startLoop(video: HTMLVideoElement, abLoop: Abloop) {
        video.removeEventListener("timeupdate", this.eventCallback as any);
        this.eventCallback = this.udpateLoop.bind(this, video, abLoop);
        video.addEventListener("timeupdate", this.eventCallback as any);

        const time = timeStringToSeconds(abLoop.a);

        video.currentTime = time;
        video.play();
    }

    stopLoop(video: HTMLVideoElement) {
        video?.removeEventListener("timeupdate", this.eventCallback as any);
    }
}
