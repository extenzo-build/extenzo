/**
 * 视频字幕插件
 * 这个类整合了字幕解析、显示和UI交互功能
 */
export class SubtitlePlugin {
    subtitles: never[];
    currentSubtitle: null;
    container: null;
    subtitleContainer: null;
    isVisible: boolean;
    videoElements: never[];
    selectedVideoIndex: number;
    video: null;
    dragStartX: number;
    dragStartY: number;
    offsetX: number;
    offsetY: number;
    animationFrameId: null;
    options: {
        fontSize: string; fontFamily: string; fontColor: string; fontWeight: string; backgroundColor: string; textShadow: string; position: string; // 'top', 'bottom'
        bottomMargin: string; topMargin: string;
    };
    /**
     * 创建字幕插件实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        // 字幕数据
        this.subtitles = [];
        this.currentSubtitle = null;
        
        // UI元素
        this.container = null;
        this.subtitleContainer = null;
        this.isVisible = true;
        
        // 视频元素
        this.videoElements = [];
        this.selectedVideoIndex = 0;
        this.video = null;
        
        // 拖动相关
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // 动画帧
        this.animationFrameId = null;
        
        // 默认样式选项
        this.options = {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            fontColor: '#ffffff',
            fontWeight: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textShadow: '2px 2px 2px #000',
            position: 'bottom', // 'top', 'bottom'
            bottomMargin: '50px',
            topMargin: '20px',
            ...options
        };
        
        // 初始化插件
        this.init();
        
        // 监听页面上的视频元素变化
        this.observeVideoElements();
    }
    
    /**
     * 初始化插件UI
     */
    init() {
        // 创建主容器
        this.container = document.createElement('div');
        this.container.className = 'subtitle-plugin-container';
        this.container.style.position = 'fixed';
        this.container.style.top = '20px';
        this.container.style.right = '20px';
        this.container.style.width = '320px';
        this.container.style.backgroundColor = 'white';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        this.container.style.zIndex = '9999999';
        this.container.style.overflow = 'hidden';
        this.container.style.transition = 'height 0.3s';
        this.container.style.fontFamily = 'Arial, sans-serif';
        
        // 创建标题栏（可拖动）
        const titleBar = document.createElement('div');
        titleBar.className = 'subtitle-plugin-title';
        titleBar.style.padding = '10px';
        titleBar.style.backgroundColor = '#4CAF50';
        titleBar.style.color = 'white';
        titleBar.style.fontWeight = 'bold';
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.cursor = 'move';
        titleBar.textContent = '视频字幕插件';
        
        // 添加拖动功能
        titleBar.addEventListener('mousedown', this.startDrag.bind(this));
        
        // 创建最小化/最大化按钮
        const toggleButton = document.createElement('span');
        toggleButton.textContent = '−';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontSize = '16px';
        toggleButton.style.width = '20px';
        toggleButton.style.height = '20px';
        toggleButton.style.display = 'flex';
        toggleButton.style.justifyContent = 'center';
        toggleButton.style.alignItems = 'center';
        toggleButton.addEventListener('click', this.toggleVisibility.bind(this));
        titleBar.appendChild(toggleButton);
        
        // 创建内容区域
        const content = document.createElement('div');
        content.className = 'subtitle-plugin-content';
        content.style.padding = '15px';
        
        // 创建上传字幕文件区域
        const uploadSection = document.createElement('div');
        uploadSection.className = 'subtitle-section';
        uploadSection.style.marginBottom = '15px';
        uploadSection.style.paddingBottom = '15px';
        uploadSection.style.borderBottom = '1px solid #eee';
        
        const uploadTitle = document.createElement('div');
        uploadTitle.className = 'section-title';
        uploadTitle.style.fontSize = '16px';
        uploadTitle.style.fontWeight = 'bold';
        uploadTitle.style.marginBottom = '10px';
        uploadTitle.style.color = '#2196F3';
        uploadTitle.textContent = '上传字幕文件';
        uploadSection.appendChild(uploadTitle);
        
        const fileUpload = document.createElement('div');
        fileUpload.style.display = 'flex';
        fileUpload.style.flexDirection = 'column';
        fileUpload.style.alignItems = 'center';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'subtitle-file';
        fileInput.accept = '.srt,.vtt,.ass,.ssa';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        const uploadBtn = document.createElement('button');
        uploadBtn.textContent = '选择字幕文件';
        uploadBtn.style.backgroundColor = '#4CAF50';
        uploadBtn.style.color = 'white';
        uploadBtn.style.padding = '8px 15px';
        uploadBtn.style.border = 'none';
        uploadBtn.style.borderRadius = '4px';
        uploadBtn.style.cursor = 'pointer';
        uploadBtn.style.fontSize = '14px';
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        const fileInfo = document.createElement('div');
        fileInfo.id = 'file-info';
        fileInfo.style.marginTop = '8px';
        fileInfo.style.fontSize = '12px';
        fileInfo.textContent = '未选择文件';
        
        fileUpload.appendChild(fileInput);
        fileUpload.appendChild(uploadBtn);
        fileUpload.appendChild(fileInfo);
        uploadSection.appendChild(fileUpload);
        
        // 创建字幕样式设置区域
        const styleSection = document.createElement('div');
        styleSection.className = 'subtitle-section';
        
        const styleTitle = document.createElement('div');
        styleTitle.className = 'section-title';
        styleTitle.style.fontSize = '16px';
        styleTitle.style.fontWeight = 'bold';
        styleTitle.style.marginBottom = '10px';
        styleTitle.style.color = '#2196F3';
        styleTitle.textContent = '字幕样式设置';
        styleSection.appendChild(styleTitle);
        
        // 创建样式控制网格
        const styleControls = document.createElement('div');
        styleControls.style.display = 'grid';
        styleControls.style.gridTemplateColumns = '1fr 1fr';
        styleControls.style.gap = '10px';
        styleControls.style.marginBottom = '15px';
        
        // 添加字体大小控制
        styleControls.appendChild(this.createControlGroup('字体大小', 'select', 'font-size', [
            { value: '16px', text: '小' },
            { value: '24px', text: '中', selected: true },
            { value: '32px', text: '大' },
            { value: '40px', text: '特大' }
        ]));
        
        // 添加字体控制
        styleControls.appendChild(this.createControlGroup('字体', 'select', 'font-family', [
            { value: 'Arial, sans-serif', text: 'Arial', selected: true },
            { value: '\'Microsoft YaHei\', sans-serif', text: '微软雅黑' },
            { value: '\'SimHei\', sans-serif', text: '黑体' },
            { value: '\'KaiTi\', serif', text: '楷体' },
            { value: '\'SimSun\', serif', text: '宋体' }
        ]));
        
        // 添加字体颜色控制
        styleControls.appendChild(this.createControlGroup('字体颜色', 'color', 'font-color', '#ffffff'));
        
        // 添加背景颜色控制
        styleControls.appendChild(this.createControlGroup('背景颜色', 'color', 'bg-color', '#000000'));
        
        // 添加背景透明度控制
        styleControls.appendChild(this.createControlGroup('背景透明度', 'range', 'bg-opacity', {
            min: 0,
            max: 1,
            step: 0.1,
            value: 0.5
        }));
        
        // 添加位置控制
        styleControls.appendChild(this.createControlGroup('字幕位置', 'select', 'position', [
            { value: 'top', text: '顶部' },
            { value: 'bottom', text: '底部', selected: true }
        ]));
        
        styleSection.appendChild(styleControls);
        
        // 创建预览区域
        const preview = document.createElement('div');
        preview.style.position = 'relative';
        preview.style.width = '100%';
        preview.style.height = '100px';
        preview.style.backgroundColor = '#000';
        preview.style.borderRadius = '4px';
        preview.style.overflow = 'hidden';
        preview.style.marginBottom = '15px';
        
        const previewText = document.createElement('div');
        previewText.id = 'preview-text';
        previewText.style.position = 'absolute';
        previewText.style.left = '50%';
        previewText.style.transform = 'translateX(-50%)';
        previewText.style.textAlign = 'center';
        previewText.style.width = '80%';
        previewText.style.padding = '8px';
        previewText.style.borderRadius = '4px';
        previewText.style.fontWeight = 'bold';
        previewText.textContent = '这是字幕预览文本';
        
        preview.appendChild(previewText);
        styleSection.appendChild(preview);
        
        // 创建视频选择下拉菜单（如果页面有多个视频）
        const videoSelectGroup = document.createElement('div');
        videoSelectGroup.style.marginBottom = '15px';
        
        const videoSelectLabel = document.createElement('label');
        videoSelectLabel.style.display = 'block';
        videoSelectLabel.style.marginBottom = '5px';
        videoSelectLabel.style.fontWeight = 'bold';
        videoSelectLabel.textContent = '选择视频';
        
        const videoSelect = document.createElement('select');
        videoSelect.id = 'video-select';
        videoSelect.style.width = '100%';
        videoSelect.style.padding = '8px';
        videoSelect.style.border = '1px solid #ddd';
        videoSelect.style.borderRadius = '4px';
        videoSelect.style.boxSizing = 'border-box';
        videoSelect.addEventListener('change', this.handleVideoSelect.bind(this));
        
        videoSelectGroup.appendChild(videoSelectLabel);
        videoSelectGroup.appendChild(videoSelect);
        styleSection.appendChild(videoSelectGroup);
        
        // 创建应用按钮
        const applyBtn = document.createElement('button');
        applyBtn.textContent = '应用到视频';
        applyBtn.style.backgroundColor = '#2196F3';
        applyBtn.style.color = 'white';
        applyBtn.style.padding = '10px';
        applyBtn.style.border = 'none';
        applyBtn.style.borderRadius = '4px';
        applyBtn.style.cursor = 'pointer';
        applyBtn.style.fontSize = '14px';
        applyBtn.style.width = '100%';
        applyBtn.addEventListener('click', this.applySubtitles.bind(this));
        styleSection.appendChild(applyBtn);
        
        // 创建状态信息区域
        const status = document.createElement('div');
        status.id = 'status';
        status.style.textAlign = 'center';
        status.style.marginTop = '10px';
        status.style.fontWeight = 'bold';
        status.style.color = '#4CAF50';
        styleSection.appendChild(status);
        
        // 组装UI
        content.appendChild(uploadSection);
        content.appendChild(styleSection);
        
        this.container.appendChild(titleBar);
        this.container.appendChild(content);
        
        // 添加到页面
        document.body.appendChild(this.container);
        
        // 初始化预览
        this.updatePreview();
        
        // 添加全局拖动事件监听
        document.addEventListener('mousemove', this.onDrag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));
    }
    
    /**
     * 创建控制组元素
     * @param {string} labelText - 标签文本
     * @param {string} type - 控件类型 (select, color, range)
     * @param {string} id - 控件ID
     * @param {any} options - 控件选项
     * @returns {HTMLElement} - 控制组元素
     */
    createControlGroup(labelText, type, id, options) {
        const group = document.createElement('div');
        group.style.marginBottom = '10px';
        
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '12px';
        label.textContent = labelText;
        label.htmlFor = id;
        
        let control;
        
        switch (type) {
            case 'select':
                control = document.createElement('select');
                control.style.width = '100%';
                control.style.padding = '6px';
                control.style.border = '1px solid #ddd';
                control.style.borderRadius = '4px';
                control.style.boxSizing = 'border-box';
                
                // 添加选项
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.text;
                    if (option.selected) optionElement.selected = true;
                    control.appendChild(optionElement);
                });
                break;
                
            case 'color':
                control = document.createElement('input');
                control.type = 'color';
                control.value = options;
                control.style.width = '100%';
                control.style.height = '30px';
                control.style.border = '1px solid #ddd';
                control.style.borderRadius = '4px';
                control.style.boxSizing = 'border-box';
                break;
                
            case 'range':
                control = document.createElement('input');
                control.type = 'range';
                control.min = options.min;
                control.max = options.max;
                control.step = options.step;
                control.value = options.value;
                control.style.width = '100%';
                control.style.boxSizing = 'border-box';
                break;
        }
        
        control.id = id;
        control.addEventListener('input', this.updatePreview.bind(this));
        control.addEventListener('change', this.updatePreview.bind(this));
        
        group.appendChild(label);
        group.appendChild(control);
        
        return group;
    }
    
    /**
     * 开始拖动面板
     * @param {MouseEvent} e - 鼠标事件
     */
    startDrag(e) {
        e.preventDefault();
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        const rect = this.container.getBoundingClientRect();
        this.offsetX = this.dragStartX - rect.left;
        this.offsetY = this.dragStartY - rect.top;
    }
    
    /**
     * 拖动面板
     * @param {MouseEvent} e - 鼠标事件
     */
    onDrag(e) {
        if (this.dragStartX === 0 && this.dragStartY === 0) return;
        
        const x = e.clientX - this.offsetX;
        const y = e.clientY - this.offsetY;
        
        // 确保不会拖出视口
        const maxX = window.innerWidth - this.container.offsetWidth;
        const maxY = window.innerHeight - this.container.offsetHeight;
        
        this.container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        this.container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        this.container.style.right = 'auto';
    }
    
    /**
     * 停止拖动面板
     */
    stopDrag() {
        this.dragStartX = 0;
        this.dragStartY = 0;
    }
    
    /**
     * 切换面板可见性
     */
    toggleVisibility() {
        const content = this.container.querySelector('.subtitle-plugin-content');
        const toggleButton = this.container.querySelector('.subtitle-plugin-title span');
        
        if (this.isVisible) {
            content.style.display = 'none';
            toggleButton.textContent = '+';
        } else {
            content.style.display = 'block';
            toggleButton.textContent = '−';
        }
        
        this.isVisible = !this.isVisible;
    }
    
    /**
     * 处理文件选择
     * @param {Event} e - 文件选择事件
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const fileInfo = document.getElementById('file-info');
        fileInfo.textContent = `已选择: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            
            try {
                // 根据文件扩展名选择解析方法
                const extension = file.name.split('.').pop().toLowerCase();
                
                switch (extension) {
                    case 'srt':
                        this.subtitles = this.parseSRT(content);
                        break;
                    case 'vtt':
                        this.subtitles = this.parseVTT(content);
                        break;
                    case 'ass':
                    case 'ssa':
                        this.subtitles = this.parseASS(content);
                        break;
                    default:
                        throw new Error('不支持的字幕格式');
                }
                
                const status = document.getElementById('status');
                status.textContent = `成功解析 ${this.subtitles.length} 条字幕`;
                status.style.color = '#4CAF50';
            } catch (error) {
                const status = document.getElementById('status');
                status.textContent = `解析失败: ${error.message}`;
                status.style.color = '#f44336';
            }
        };
        
        reader.onerror = () => {
            const status = document.getElementById('status');
            status.textContent = '读取文件失败';
            status.style.color = '#f44336';
        };
        
        reader.readAsText(file);
    }
    
    /**
     * 更新预览
     */
    updatePreview() {
        const fontSize = document.getElementById('font-size')?.value || this.options.fontSize;
        const fontFamily = document.getElementById('font-family')?.value || this.options.fontFamily;
        const fontColor = document.getElementById('font-color')?.value || this.options.fontColor;
        const bgColor = document.getElementById('bg-color')?.value || '#000000';
        const bgOpacity = document.getElementById('bg-opacity')?.value || 0.5;
        const position = document.getElementById('position')?.value || this.options.position;
        
        const previewText = document.getElementById('preview-text');
        if (!previewText) return;
        
        // 更新预览文本样式
        previewText.style.fontSize = fontSize;
        previewText.style.fontFamily = fontFamily;
        previewText.style.color = fontColor;
        previewText.style.backgroundColor = this.hexToRgba(bgColor, bgOpacity);
        previewText.style.textShadow = '2px 2px 2px #000';
        
        // 更新预览文本位置
        if (position === 'top') {
            previewText.style.top = '10px';
            previewText.style.bottom = 'auto';
        } else {
            previewText.style.bottom = '10px';
            previewText.style.top = 'auto';
        }
    }
    
    /**
     * 十六进制颜色转RGBA
     * @param {string} hex - 十六进制颜色
     * @param {number} opacity - 透明度
     * @returns {string} - RGBA颜色字符串
     */
    hexToRgba(hex, opacity) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    /**
     * 处理视频选择
     * @param {Event} e - 选择事件
     */
    handleVideoSelect(e) {
        const index = parseInt(e.target.value);
        if (isNaN(index) || index < 0 || index >= this.videoElements.length) return;
        
        this.selectedVideoIndex = index;
        this.video = this.videoElements[index];
    }
    
    /**
     * 应用字幕到视频
     */
    applySubtitles() {
        if (this.subtitles.length === 0) {
            const status = document.getElementById('status');
            status.textContent = '请先上传并解析字幕文件';
            status.style.color = '#f44336';
            return;
        }
        
        if (this.videoElements.length === 0) {
            const status = document.getElementById('status');
            status.textContent = '页面上没有找到视频元素';
            status.style.color = '#f44336';
            return;
        }
        
        // 获取当前样式设置
        const fontSize = document.getElementById('font-size')?.value || this.options.fontSize;
        const fontFamily = document.getElementById('font-family')?.value || this.options.fontFamily;
        const fontColor = document.getElementById('font-color')?.value || this.options.fontColor;
        const bgColor = document.getElementById('bg-color')?.value || '#000000';
        const bgOpacity = document.getElementById('bg-opacity')?.value || 0.5;
        const position = document.getElementById('position')?.value || this.options.position;
        
        const styleOptions = {
            fontSize,
            fontFamily,
            fontColor,
            backgroundColor: this.hexToRgba(bgColor, bgOpacity),
            textShadow: '2px 2px 2px #000',
            position,
            bottomMargin: '50px',
            topMargin: '20px'
        };
        
        // 如果已有字幕容器，先移除
        if (this.subtitleContainer) {
            this.subtitleContainer.remove();
            this.subtitleContainer = null;
            
            // 停止动画帧
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }
        
        // 创建字幕容器
        this.createSubtitleContainer(styleOptions);
        
        // 开始跟踪视频时间并显示字幕
        this.startTracking();
        
        const status = document.getElementById('status');
        status.textContent = '字幕已应用到视频';
        status.style.color = '#4CAF50';
    }
    
    /**
     * 创建字幕容器
     * @param {Object} styleOptions - 样式选项
     */
    createSubtitleContainer(styleOptions) {
        const video = this.videoElements[this.selectedVideoIndex];
        if (!video) return;
        
        this.video = video;
        
        // 创建字幕容器
        this.subtitleContainer = document.createElement('div');
        this.subtitleContainer.className = 'video-subtitle-container';
        this.subtitleContainer.style.position = 'absolute';
        this.subtitleContainer.style.left = '50%';
        this.subtitleContainer.style.transform = 'translateX(-50%)';
        this.subtitleContainer.style.textAlign = 'center';
        this.subtitleContainer.style.width = '80%';
        this.subtitleContainer.style.padding = '10px';
        this.subtitleContainer.style.zIndex = '10000';
        this.subtitleContainer.style.pointerEvents = 'none'; // 允许点击穿透
        
        // 应用样式
        this.subtitleContainer.style.fontSize = styleOptions.fontSize;
        this.subtitleContainer.style.fontFamily = styleOptions.fontFamily;
        this.subtitleContainer.style.color = styleOptions.fontColor;
        this.subtitleContainer.style.fontWeight = 'bold';
        this.subtitleContainer.style.backgroundColor = styleOptions.backgroundColor;
        this.subtitleContainer.style.textShadow = styleOptions.textShadow;
        
        // 设置位置
        if (styleOptions.position === 'top') {
            this.subtitleContainer.style.top = styleOptions.topMargin;
            this.subtitleContainer.style.bottom = 'auto';
        } else {
            this.subtitleContainer.style.bottom = styleOptions.bottomMargin;
            this.subtitleContainer.style.top = 'auto';
        }
        
        // 将容器添加到视频容器中
        const videoContainer = video.parentElement;
        if (videoContainer) {
            videoContainer.style.position = 'relative';
            videoContainer.appendChild(this.subtitleContainer);
        } else {
            // 如果视频没有父容器，创建一个包装器
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            
            // 替换视频元素
            video.parentNode.insertBefore(wrapper, video);
            wrapper.appendChild(video);
            wrapper.appendChild(this.subtitleContainer);
        }
    }
    
    /**
     * 开始跟踪视频时间并显示对应字幕
     */
    startTracking() {
        const updateSubtitle = () => {
            if (!this.video || this.subtitles.length === 0) {
                this.animationFrameId = requestAnimationFrame(updateSubtitle);
                return;
            }
            
            const currentTime = this.video.currentTime * 1000; // 转换为毫秒
            let foundSubtitle = null;
            
            // 查找当前时间对应的字幕
            for (const subtitle of this.subtitles) {
                if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
                    foundSubtitle = subtitle;
                    break;
                }
            }
            
            // 更新字幕显示
            if (foundSubtitle !== this.currentSubtitle) {
                this.currentSubtitle = foundSubtitle;
                
                if (foundSubtitle) {
                    this.subtitleContainer.textContent = foundSubtitle.text;
                    this.subtitleContainer.style.display = 'block';
                } else {
                    this.subtitleContainer.textContent = '';
                    this.subtitleContainer.style.display = 'none';
                }
            }
            
            this.animationFrameId = requestAnimationFrame(updateSubtitle);
        };
        
        updateSubtitle();
    }
    
    /**
     * 更新视频列表
     */
    updateVideoList() {
        // 查找页面上所有视频元素
        this.videoElements = Array.from(document.querySelectorAll('video'));
        
        // 更新视频选择下拉菜单
        const videoSelect = document.getElementById('video-select');
        if (!videoSelect) return;
        
        // 清空现有选项
        videoSelect.innerHTML = '';
        
        // 添加视频选项
        this.videoElements.forEach((video, index) => {
            const option = document.createElement('option');
            option.value = index;
            
            // 尝试获取视频标题或使用索引作为标识
            let videoTitle = `视频 ${index + 1}`;
            if (video.title) {
                videoTitle = video.title;
            } else if (video.id) {
                videoTitle = `视频 (ID: ${video.id})`;
            } else if (video.src) {
                const srcParts = video.src.split('/');
                videoTitle = `视频 (${srcParts[srcParts.length - 1]})`;
            }
            
            option.textContent = videoTitle;
            videoSelect.appendChild(option);
        });
        
        // 如果有视频，选择第一个
        if (this.videoElements.length > 0) {
            this.selectedVideoIndex = 0;
            this.video = this.videoElements[0];
            videoSelect.value = '0';
        }
    }
    
    /**
     * 监听页面上的视频元素变化
     */
    observeVideoElements() {
        // 初始化视频列表
        this.updateVideoList();
        
        // 创建MutationObserver监听DOM变化
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            for (const mutation of mutations) {
                // 检查是否有视频元素被添加或移除
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeName === 'VIDEO' || node.querySelector && node.querySelector('video')) {
                            shouldUpdate = true;
                            break;
                        }
                    }
                    
                    for (const node of mutation.removedNodes) {
                        if (node.nodeName === 'VIDEO' || node.querySelector && node.querySelector('video')) {
                            shouldUpdate = true;
                            break;
                        }
                    }
                }
                
                if (shouldUpdate) break;
            }
            
            if (shouldUpdate) {
                this.updateVideoList();
            }
        });
        
        // 开始观察整个文档
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 解析SRT格式字幕
     * @param {string} content - SRT文件内容
     * @returns {Array<Object>} - 字幕数组
     */
    parseSRT(content) {
        const subtitles = [];
        const blocks = content.trim().split(/\r?\n\r?\n/);
        
        for (const block of blocks) {
            const lines = block.split(/\r?\n/);
            if (lines.length < 3) continue;
            
            // 跳过字幕序号
            const timeLine = lines[1];
            const textLines = lines.slice(2);
            
            // 解析时间
            const timeMatch = timeLine.match(/([\d:,]+)\s+-->\s+([\d:,]+)/);
            if (!timeMatch) continue;
            
            const startTime = this.parseTimeString(timeMatch[1]);
            const endTime = this.parseTimeString(timeMatch[2]);
            
            // 合并多行文本
            const text = textLines.join(' ').trim();
            
            subtitles.push({
                startTime,
                endTime,
                text
            });
        }
        
        return subtitles;
    }
    
    /**
     * 解析VTT格式字幕
     * @param {string} content - VTT文件内容
     * @returns {Array<Object>} - 字幕数组
     */
    parseVTT(content) {
        const subtitles = [];
        
        // 移除WEBVTT头部
        const lines = content.replace(/^WEBVTT.*\r?\n/, '').split(/\r?\n/);
        
        let currentSubtitle = null;
        let collectingText = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 空行重置当前字幕
            if (line === '') {
                if (currentSubtitle && currentSubtitle.text) {
                    subtitles.push(currentSubtitle);
                }
                currentSubtitle = null;
                collectingText = false;
                continue;
            }
            
            // 时间行
            const timeMatch = line.match(/([\d:.]+)\s+-->\s+([\d:.]+)/);
            if (timeMatch) {
                currentSubtitle = {
                    startTime: this.parseTimeString(timeMatch[1]),
                    endTime: this.parseTimeString(timeMatch[2]),
                    text: ''
                };
                collectingText = true;
                continue;
            }
            
            // 文本行
            if (collectingText && currentSubtitle) {
                if (currentSubtitle.text) {
                    currentSubtitle.text += ' ' + line;
                } else {
                    currentSubtitle.text = line;
                }
            }
        }
        
        // 添加最后一个字幕
        if (currentSubtitle && currentSubtitle.text) {
            subtitles.push(currentSubtitle);
        }
        
        return subtitles;
    }
    
    /**
     * 解析ASS/SSA格式字幕
     * @param {string} content - ASS/SSA文件内容
     * @returns {Array<Object>} - 字幕数组
     */
    parseASS(content) {
        const subtitles = [];
        const lines = content.split(/\r?\n/);
        
        // 查找[Events]部分
        let eventsSection = false;
        let formatLine = null;
        let textIndex = -1;
        let startIndex = -1;
        let endIndex = -1;
        
        for (const line of lines) {
            // 查找Events部分
            if (line.trim() === '[Events]') {
                eventsSection = true;
                continue;
            }
            
            // 如果不在Events部分，继续
            if (!eventsSection) continue;
            
            // 解析Format行
            if (line.startsWith('Format:')) {
                formatLine = line.substring(7).split(',').map(item => item.trim());
                textIndex = formatLine.indexOf('Text');
                startIndex = formatLine.indexOf('Start');
                endIndex = formatLine.indexOf('End');
                continue;
            }
            
            // 解析Dialogue行
            if (formatLine && line.startsWith('Dialogue:')) {
                const parts = this.splitAssDialogue(line.substring(9));
                
                if (parts.length > Math.max(textIndex, startIndex, endIndex) && startIndex >= 0 && endIndex >= 0 && textIndex >= 0) {
                    const startTime = this.parseAssTimeString(parts[startIndex]);
                    const endTime = this.parseAssTimeString(parts[endIndex]);
                    let text = parts[textIndex];
                    
                    // 移除ASS格式标签
                    text = text.replace(/{[^}]*}/g, '');
                    
                    subtitles.push({
                        startTime,
                        endTime,
                        text
                    });
                }
            }
        }
        
        return subtitles;
    }
    
    /**
     * 分割ASS对话行，考虑逗号在花括号内的情况
     * @param {string} line - 对话行
     * @returns {Array<string>} - 分割后的部分
     */
    splitAssDialogue(line) {
        const parts = [];
        let currentPart = '';
        let insideBraces = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '{') {
                insideBraces = true;
                currentPart += char;
            } else if (char === '}') {
                insideBraces = false;
                currentPart += char;
            } else if (char === ',' && !insideBraces) {
                parts.push(currentPart.trim());
                currentPart = '';
            } else {
                currentPart += char;
            }
        }
        
        if (currentPart) {
            parts.push(currentPart.trim());
        }
        
        return parts;
    }
    
    /**
     * 解析SRT/VTT时间字符串为毫秒
     * @param {string} timeString - 时间字符串 (00:00:00,000 或 00:00:00.000)
     * @returns {number} - 毫秒时间
     */
    parseTimeString(timeString) {
        // 统一替换,为.
        timeString = timeString.replace(',', '.');
        
        // 解析时间部分
        const parts = timeString.split(':');
        let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
        
        if (parts.length === 3) {
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
            
            // 处理秒和毫秒
            const secondParts = parts[2].split('.');
            seconds = parseInt(secondParts[0]);
            if (secondParts.length > 1) {
                // 确保毫秒部分有3位数
                const msString = secondParts[1].padEnd(3, '0').substring(0, 3);
                milliseconds = parseInt(msString);
            }
        } else if (parts.length === 2) {
            minutes = parseInt(parts[0]);
            
            // 处理秒和毫秒
            const secondParts = parts[1].split('.');
            seconds = parseInt(secondParts[0]);
            if (secondParts.length > 1) {
                const msString = secondParts[1].padEnd(3, '0').substring(0, 3);
                milliseconds = parseInt(msString);
            }
        }
        
        return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
    }
    
    /**
     * 解析ASS时间字符串为毫秒
     * @param {string} timeString - 时间字符串 (h:mm:ss.cc)
     * @returns {number} - 毫秒时间
     */
    parseAssTimeString(timeString) {
        const parts = timeString.trim().split(':');
        let hours = 0, minutes = 0, seconds = 0, centiseconds = 0;
        
        if (parts.length === 3) {
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
            
            // 处理秒和厘秒
            const secondParts = parts[2].split('.');
            seconds = parseInt(secondParts[0]);
            if (secondParts.length > 1) {
                centiseconds = parseInt(secondParts[1]);
            }
        }
        
        return hours * 3600000 + minutes * 60000 + seconds * 1000 + centiseconds * 10;
    }
}