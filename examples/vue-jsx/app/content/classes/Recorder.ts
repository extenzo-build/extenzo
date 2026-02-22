import { saveAs } from "file-saver";
import { formatTime } from "app/popup/utils";
import { sendRuntimeMessage } from "app/util";

export default class Record {
  mediaRecorder: any = null;
  _recordedChunks: any[] = [];
  _startRecordTime = 0;
  private recordButton: HTMLElement | null = null;
  private stopRecordCallback: Function | null = null;

  constructor() {
    // this.addElement(video);
  }

  get status() {
    return this.mediaRecorder?.state ?? undefined;
  }

  get time() {
    return this._startRecordTime;
  }

  addElement(video: HTMLVideoElement, onStopRecord?: Function) {
    if (!document.body) return;

    // 存储停止录制的回调函数
    this.stopRecordCallback = onStopRecord || null;

    // 移除已存在的录制按钮
    this.removeRecordButton();

    // 添加CSS样式
    this.addRecordButtonStyles();

    // 创建录制按钮容器
    const recordContainer = document.createElement("div");
    recordContainer.setAttribute("id", "video-roll-record-container");
    recordContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;

    // 创建录制按钮
    const recordButton = document.createElement("div");
    recordButton.setAttribute("id", "video-roll-record-button");
    recordButton.setAttribute("class", "video-roll-recording");
    recordButton.innerHTML = `
            <div class="record-button-content">
                <div class="record-icon">
                    <div class="record-dot"></div>
                    <div class="stop-square" style="display: none;"></div>
                </div>
                <span class="record-time"></span>
                <span class="record-text">Recording</span>
            </div>
        `;

    recordButton.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: linear-gradient(135deg, #ff4757, #ff3838);
            color: white;
            border-radius: 25px;
            box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
            cursor: pointer;
            pointer-events: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            user-select: none;
            transition: all 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;

    // 添加点击事件停止录制
    recordButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleStopRecord(video);
    });

    // 添加悬停效果
    recordButton.addEventListener("mouseenter", () => {
      recordButton.style.transform = "scale(1.05)";
      recordButton.style.boxShadow = "0 6px 20px rgba(255, 71, 87, 0.6)";

      // 切换图标和文案
      const recordDot = recordButton.querySelector(
        ".record-dot"
      ) as HTMLElement;
      const stopSquare = recordButton.querySelector(
        ".stop-square"
      ) as HTMLElement;
      const recordText = recordButton.querySelector(
        ".record-text"
      ) as HTMLElement;

      if (recordDot) recordDot.style.display = "none";
      if (stopSquare) stopSquare.style.display = "block";
      if (recordText) recordText.textContent = "Stop Recording";
    });

    recordButton.addEventListener("mouseleave", () => {
      recordButton.style.transform = "scale(1)";
      recordButton.style.boxShadow = "0 4px 15px rgba(255, 71, 87, 0.4)";

      // 恢复图标和文案
      const recordDot = recordButton.querySelector(
        ".record-dot"
      ) as HTMLElement;
      const stopSquare = recordButton.querySelector(
        ".stop-square"
      ) as HTMLElement;
      const recordText = recordButton.querySelector(
        ".record-text"
      ) as HTMLElement;

      if (recordDot) recordDot.style.display = "block";
      if (stopSquare) stopSquare.style.display = "none";
      if (recordText) recordText.textContent = "Recording";
    });

    recordContainer.appendChild(recordButton);
    document.body.appendChild(recordContainer);

    this.recordButton = recordButton;
  }

  updateTime(time: any) {
    // 如果录制按钮存在，更新其状态
    if (this.status === "recording" && this.recordButton) {
      const recordTime = this.recordButton.querySelector(
        ".record-time"
      ) as HTMLElement;
      if (recordTime) {
        recordTime.textContent = `${formatTime(
          String(time - this._startRecordTime)
        )}`;
      }
    }
  }

  private addRecordButtonStyles() {
    // 检查是否已经添加过样式
    if (document.getElementById("video-roll-record-styles")) return;

    const style = document.createElement("style");
    style.id = "video-roll-record-styles";
    style.textContent = `
            @keyframes recordBlink {
                0% { opacity: 1; background-color: #22d86e; }
                50% { opacity: 0.6; background-color: #1bbf75; }
                100% { opacity: 1; background-color: #22d86e; }
            }

            @keyframes recordPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            @keyframes recordGlow {
                0% { box-shadow: 0 0 5px rgba(255, 71, 87, 0.5); }
                50% { box-shadow: 0 0 20px rgba(255, 71, 87, 0.8), 0 0 30px rgba(255, 71, 87, 0.6); }
                100% { box-shadow: 0 0 5px rgba(255, 71, 87, 0.5); }
            }

            .video-roll-recording {
                animation: recordGlow 2s ease-in-out infinite;
            }

            .record-button-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .record-icon {
                position: relative;
                width: 12px;
                height: 12px;
            }

            .record-dot {
                width: 12px;
                height: 12px;
                background: green;
                border-radius: 50%;
                animation: recordBlink 1.5s ease-in-out infinite, recordPulse 2s ease-in-out infinite;
                position: absolute;
                top: 0;
                left: 0;
            }

            .stop-square {
                width: 8px;
                height: 8px;
                background-color: white;
                border-radius: 2px;
                position: absolute;
                top: 2px;
                left: 2px;
                transition: all 0.2s ease;
            }
            
            .record-time {
                font-weight: 500;
                color:  white;
                }

            .record-text {
                font-weight: 500;
                letter-spacing: 0.5px;
            }

            #video-roll-record-button:active {
                transform: scale(0.95) !important;
            }

            .record-button-fade-out {
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.3s ease-out;
            }
        `;
    document.head.appendChild(style);
  }

  private handleStopRecord(video?: HTMLVideoElement) {
    // 停止录制
    this.stopRecord(video);

    // 调用外部提供的停止录制回调
    if (this.stopRecordCallback) {
      this.stopRecordCallback();
    }

    // 隐藏录制按钮
    this.hideRecordButton(video);
  }

  hideRecordButton(video?: HTMLVideoElement) {
    if (this.recordButton) {
      // 添加淡出动画
      this.recordButton.classList.add("record-button-fade-out");

      setTimeout(() => {
        this.removeRecordButton(video);
      }, 300);
    }
  }

  private removeRecordButton(video?: HTMLVideoElement) {
    const container = document.getElementById("video-roll-record-container");
    if (container) {
      container.remove();
    }

    this.recordButton = null;
  }

  private removeRecordStyles() {
    const styles = document.getElementById("video-roll-record-styles");
    if (styles) {
      styles.remove();
    }
  }

  startRecord(video: HTMLVideoElement, callback: Function) {
    if (!video) {
      callback({
        recordInfo: "No video element found",
        recordTime: this._startRecordTime,
      });
      return;
    }
    try {
      video.play(); // 确保视频开始播放
      video.currentTime = 0; // 重置视频时间
    } catch (error) {
      console.error("Error playing video:", error);
    }

    setTimeout(() => {
      if (!video.paused) {
        // if user chooses only video
        // drawVideoOnCanvas();

        try {
          //截取到媒体流
          const stream = (video as any)?.captureStream?.(60); // 25 FPS

          this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/mp4",
          });

          this._startRecordTime = video.currentTime;

          // 当有数据可用时，处理数据
          this.mediaRecorder.ondataavailable = (event: any) => {
            if (event.data.size > 0) {
              this._recordedChunks.push(event.data);
            }
          };

          this.mediaRecorder.onerror = (event: any) => {
            this._recordedChunks = [];
            this._startRecordTime = 0;
            this.hideRecordButton(video);
            callback({
              recordInfo: event,
              recordTime: this._startRecordTime,
            });
          };

          this.download(callback);

          this.mediaRecorder.start();
          // 添加录制按钮
          this.addElement(video, () => {
            this.stopRecord(video);
          });
          callback({
            recordInfo: undefined,
            recordTime: this._startRecordTime,
            recordStatus: this.status,
          });
        } catch (error) {
          this._recordedChunks = [];
          this._startRecordTime = 0;
          this.hideRecordButton(video);
          callback({
            recordInfo: error,
            recordTime: this._startRecordTime,
          });
        }

        return;
      }

      this.hideRecordButton(video);
      callback({
        recordInfo: "Cannot start recording, video is not ready",
        recordTime: this._startRecordTime,
      });
    }, 400);
  }

  stopRecord(video?: any) {
    this.mediaRecorder?.stop?.();
    this.hideRecordButton(video);
  }

  download(callback: Function) {
    // 当录制停止时，生成视频文件
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this._recordedChunks, { type: "video/mp4" });

      // 使用 file-saver 保存 Blob 文件
      saveAs(blob, `${document.title ? document.title : "recorded-video"}.mp4`);
      this._recordedChunks = [];
      this._startRecordTime = 0;

      // 确保录制按钮被隐藏
      this.hideRecordButton();

      callback({
        recordInfo: "Video recorded successfully",
        recordTime: this._startRecordTime,
      });
    };
  }
}
