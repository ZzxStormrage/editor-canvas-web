<template>
  <div class="image-editor" ref="editor" @mouseover="scaleImg" @mouseout="cancelScale" @click.stop>
    <div class="editor-box" v-if="imgs">
      <div class="editor-box-canvas" v-show="!loading" :style="editorBoxStyle">
        <img :src="imgs" alt="editor-img" ref="editorImg" />
      </div>
    </div>
    <div
      class="editor-drag-box"
      ref="editorDragBox"
      :class="{ 'editor-move': move && !crop, 'editor-crop': crop, 'editor-modal': cropping }"
      @mousedown.stop="startMove"
      @touchstart="startMove"
    ></div>
    <div v-show="cropping" class="editor-crop-box" :style="editorCropBoxStyle">
      <span class="editor-view-box">
        <img :style="editorViewImgStyle" :src="imgs" alt="editor-img" />
      </span>
      <!-- {{moveInfos}} -->
      <span
        class="editor-face editor-move"
        ref="editorMoveBox"
        @mousedown.stop="cropMove"
        @touchstart="cropMove"
      ></span>

      <div class="crop-point-line crop-point-line-h top-left"></div>
      <div class="crop-point-line crop-point-line-v top-left"></div>
      <div class="crop-point-line crop-point-line-h top-center"></div>
      <div class="crop-point-line crop-point-line-h top-right"></div>
      <div class="crop-point-line crop-point-line-v top-right"></div>
      <div class="crop-point-line crop-point-line-h bottom-left"></div>
      <div class="crop-point-line crop-point-line-v bottom-left"></div>
      <div class="crop-point-line crop-point-line-h bottom-center"></div>
      <div class="crop-point-line crop-point-line-h bottom-right"></div>
      <div class="crop-point-line crop-point-line-v bottom-right"></div>
      <div class="crop-point-line crop-point-line-v left-center"></div>
      <div class="crop-point-line crop-point-line-v right-center"></div>

      <!-- 拖动的点 -->
      <span v-if="!fixedBox">
        <span
          class="crop-line line-w"
          @mousedown="changeCropSize($event, false, true, 0, 1)"
          @touchstart="changeCropSize($event, false, true, 0, 1)"
        ></span>
        <span
          class="crop-line line-a"
          @mousedown="changeCropSize($event, true, false, 1, 0)"
          @touchstart="changeCropSize($event, true, false, 1, 0)"
        ></span>
        <span
          class="crop-line line-s"
          @mousedown="changeCropSize($event, false, true, 0, 2)"
          @touchstart="changeCropSize($event, false, true, 0, 2)"
        ></span>
        <span
          class="crop-line line-d"
          @mousedown="changeCropSize($event, true, false, 2, 0)"
          @touchstart="changeCropSize($event, true, false, 2, 0)"
        ></span>
        <span
          class="crop-point point1"
          @mousedown="changeCropSize($event, true, true, 1, 1)"
          @touchstart="changeCropSize($event, true, true, 1, 1)"
        ></span>
        <span
          class="crop-point point2"
          @mousedown="changeCropSize($event, false, true, 0, 1)"
          @touchstart="changeCropSize($event, false, true, 0, 1)"
        ></span>
        <span
          class="crop-point point3"
          @mousedown="changeCropSize($event, true, true, 2, 1)"
          @touchstart="changeCropSize($event, true, true, 2, 1)"
        ></span>
        <span
          class="crop-point point4"
          @mousedown="changeCropSize($event, true, false, 1, 0)"
          @touchstart="changeCropSize($event, true, false, 1, 0)"
        ></span>
        <span
          class="crop-point point5"
          @mousedown="changeCropSize($event, true, false, 2, 0)"
          @touchstart="changeCropSize($event, true, false, 2, 0)"
        ></span>
        <span
          class="crop-point point6"
          @mousedown="changeCropSize($event, true, true, 1, 2)"
          @touchstart="changeCropSize($event, true, true, 1, 2)"
        ></span>
        <span
          class="crop-point point7"
          @mousedown="changeCropSize($event, false, true, 0, 2)"
          @touchstart="changeCropSize($event, false, true, 0, 2)"
        ></span>
        <span
          class="crop-point point8"
          @mousedown="changeCropSize($event, true, true, 2, 2)"
          @touchstart="changeCropSize($event, true, true, 2, 2)"
        ></span>
      </span>
    </div>
  </div>
</template>

<script>
import exifmin from '../utils/exif-js-min'

/**
 * 判断图片地址是否需要匿名跨域加载。
 * 本地 blob/data 地址不应设置 crossOrigin，避免旧版移动 WebView 加载失败。
 *
 * @param {unknown} source 图片地址。
 * @returns {boolean} 是否为远程网络图片。
 */
function shouldUseAnonymousCrossOrigin(source) {
  return /^(https?:)?\/\//i.test(String(source ?? ''))
}

export default {
  data: function () {
    return {
      // 容器高宽
      w: 0,
      h: 0,
      // 图片缩放比例
      scale: 1,
      // 图片偏移x轴
      x: 0,
      // 图片偏移y轴
      y: 0,
      // 图片加载
      loading: true,
      // 图片真实宽度
      trueWidth: 0,
      // 图片真实高度
      trueHeight: 0,
      move: true,
      // 移动的x
      moveX: 0,
      // 移动的y
      moveY: 0,
      // 开启截图
      crop: false,
      // 正在截图
      cropping: false,
      // 裁剪框大小
      cropW: 0,
      cropH: 0,
      cropOldW: 0,
      cropOldH: 0,
      // 判断是否能够改变
      canChangeX: false,
      canChangeY: false,
      // 改变的基准点
      changeCropTypeX: 1,
      changeCropTypeY: 1,
      // 裁剪框的坐标轴
      cropX: 0,
      cropY: 0,
      cropChangeX: 0,
      cropChangeY: 0,
      cropOffsertX: 0,
      cropOffsertY: 0,
      // 支持的滚动事件
      support: '',
      // 移动端手指缩放
      touches: [],
      touchNow: false,
      // 图片旋转
      rotate: 0,
      isIos: false,
      orientation: 0,
      imgs: '',
      // 图片缩放系数
      coe: 0.2,
      // 是否正在多次缩放
      scaling: false,
      scalingSet: '',
      coeStatus: '',
      // 控制emit触发频率
      isCanShow: true,
      moveInfos: ''
    }
  },
  props: {
    img: {
      type: [String, Blob, null, File],
      default: ''
    },
    // 输出图片压缩比
    outputSize: {
      type: Number,
      default: 1
    },
    outputType: {
      type: String,
      default: 'jpeg'
    },
    info: {
      type: Boolean,
      default: true
    },
    // 是否开启滚轮放大缩小
    canScale: {
      type: Boolean,
      default: true
    },
    // 是否自成截图框
    autoCrop: {
      type: Boolean,
      default: false
    },
    autoCropWidth: {
      type: [Number, String],
      default: 0
    },
    autoCropHeight: {
      type: [Number, String],
      default: 0
    },
    // 是否开启固定宽高比
    fixed: {
      type: Boolean,
      default: false
    },
    // 宽高比 w/h
    fixedNumber: {
      type: Array,
      default: () => {
        return [1, 1]
      }
    },
    // 固定大小 禁止改变截图框大小
    fixedBox: {
      type: Boolean,
      default: false
    },
    // 输出截图是否缩放
    full: {
      type: Boolean,
      default: false
    },
    // 是否可以拖动图片
    canMove: {
      type: Boolean,
      default: true
    },
    // 是否可以拖动截图框
    // 与图片的可移动 （canMove） 只能二选1.优先框的移动(如果设置了框可移动的话)
    canMoveBox: {
      type: Boolean,
      default: true
    },
    // 上传图片按照原始比例显示
    original: {
      type: Boolean,
      default: false
    },
    // 截图框能否超过图片
    centerBox: {
      type: Boolean,
      default: false
    },
    // 是否根据dpr输出高清图片
    high: {
      type: Boolean,
      default: true
    },
    // 截图框展示宽高类型
    infoTrue: {
      type: Boolean,
      default: false
    },
    // 可以压缩图片宽高  默认不超过200
    maxImgSize: {
      type: [Number, String],
      default: 2000
    },
    // 倍数  可渲染当前截图框的n倍 0 - 1000;
    enlarge: {
      type: [Number, String],
      default: 1
    },

    // 自动预览的固定宽度
    preW: {
      type: [Number, String],
      default: 0
    },
    /*
        图片布局方式 mode 实现和css背景一样的效果
        contain  居中布局 默认不会缩放 保证图片在容器里面 mode: 'contain'
        cover    拉伸布局 填充整个容器  mode: 'cover'
        如果仅有一个数值被给定，这个数值将作为宽度值大小，高度值将被设定为auto。 mode: '50px'
        如果有两个数值被给定，第一个将作为宽度值大小，第二个作为高度值大小。 mode: '50px 60px'
      */
    mode: {
      type: String,
      default: 'contain'
    },
    // 限制最小区域,可传1以上的数字和字符串，限制长宽都是这么大
    // 也可以传数组[90,90]
    limitMinSize: {
      type: [Number, Array, String],
      default: () => {
        return 10
      }
    },
    scalePi: {
      default: 5,
      type: Number
    }
  },
  computed: {
    cropInfo() {
      const obj = {}
      obj.top = this.cropOffsertY > 21 ? '-21px' : '0px'
      obj.width = this.cropW > 0 ? this.cropW : 0
      obj.height = this.cropH > 0 ? this.cropH : 0
      if (this.infoTrue) {
        let dpr = 1
        if (this.high && !this.full) {
          dpr = window.devicePixelRatio
        }
        if ((this.enlarge !== 1) & !this.full) {
          dpr = Math.abs(Number(this.enlarge))
        }
        obj.width = obj.width * dpr
        obj.height = obj.height * dpr
        if (this.full) {
          obj.width = obj.width / this.scale
          obj.height = obj.height / this.scale
        }
      }
      obj.width = obj.width.toFixed(0)
      obj.height = obj.height.toFixed(0)
      return obj
    },

    isIE() {
      const { userAgent } = navigator // 取得浏览器的userAgent字符串
      const isIE = !!window.ActiveXObject || 'ActiveXObject' in window // 判断是否IE浏览器
      return isIE
    },

    passive() {
      return this.isIE
        ? null
        : {
            passive: false
          }
    },
    editorBoxStyle() {
      return {
        width: this.trueWidth + 'px',
        height: this.trueHeight + 'px',
        transform:
          'scale(' +
          this.scale +
          ',' +
          this.scale +
          ') ' +
          'translate3d(' +
          this.x / this.scale +
          'px,' +
          this.y / this.scale +
          'px,' +
          '0)' +
          'rotateZ(' +
          this.rotate * 90 +
          'deg)',
        'transform-origin': 'center center;'
      }
    },
    editorCropBoxStyle() {
      return {
        width: this.cropW + 'px',
        height: this.cropH + 'px',
        transform: 'translate3d(' + this.cropOffsertX + 'px,' + this.cropOffsertY + 'px,' + '0)',
        'transform-origin': 'center center;'
      }
    },
    editorViewImgStyle() {
      return {
        width: this.trueWidth + 'px',
        height: this.trueHeight + 'px',
        transform:
          'scale(' +
          this.scale +
          ',' +
          this.scale +
          ') ' +
          'translate3d(' +
          (this.x - this.cropOffsertX) / this.scale +
          'px,' +
          (this.y - this.cropOffsertY) / this.scale +
          'px,' +
          '0)' +
          'rotateZ(' +
          this.rotate * 90 +
          'deg)',
        'transform-origin': 'center center;'
      }
    },
    // 图片编辑的数据
    imageEditInfos() {
      // 图片的数据
      const imageInfos = {
        width: this.trueWidth,
        height: this.trueHeight,
        scale: this.scale,
        rotate: this.rotate
      }

      // 裁剪框的数据
      const cropInfos = {
        width: this.cropW,
        height: this.cropH,
        offsertX: this.cropOffsertX,
        offsertY: this.cropOffsertY
      }

      return {
        imageInfos,
        cropInfos
      }
    }
  },
  watch: {
    // 如果图片改变， 重新布局
    img() {
      // 当传入图片时, 读取图片信息同时展示
      this.checkedImg()
    },
    imgs(val) {
      if (val === '') {
        return
      }
      this.reload()
    },
    cropW() {
      this.showPreview()
    },
    cropH() {
      this.showPreview()
    },
    cropOffsertX() {
      this.showPreview()
    },
    cropOffsertY() {
      this.showPreview()
    },
    scale(val, oldVal) {
      this.showPreview()
    },
    x() {
      this.showPreview()
    },
    y() {
      this.showPreview()
    },
    autoCrop(val) {
      if (val) {
        this.goAutoCrop()
      }
    },
    // 修改了自动截图框
    autoCropWidth() {
      if (this.autoCrop) {
        this.goAutoCrop()
      }
    },
    autoCropHeight() {
      if (this.autoCrop) {
        this.goAutoCrop()
      }
    },
    mode() {
      this.checkedImg()
    },
    rotate() {
      this.showPreview()
      if (this.autoCrop) {
        this.goAutoCrop(this.cropW, this.cropH)
      } else {
        if (this.cropW > 0 || this.cropH > 0) {
          this.goAutoCrop(this.cropW, this.cropH)
        }
      }
    }
  },
  methods: {
    getVersion(name) {
      const arr = navigator.userAgent.split(' ')
      let chromeVersion = ''
      let result = 0
      const reg = new RegExp(name, 'i')
      for (let i = 0; i < arr.length; i++) {
        if (reg.test(arr[i])) {
          chromeVersion = arr[i]
        }
      }
      if (chromeVersion) {
        result = chromeVersion.split('/')[1].split('.')
      } else {
        result = ['0', '0', '0']
      }
      return result
    },
    // 处理图片旋转的问题（手机拍摄，相机拍摄原图旋转的修正）-通过canvas直接画出来
    checkOrientationImage(img, orientation, width, height) {
      // console.log('处理旋转问题',width, height)
      // 如果是 chrome内核版本在81 safari 在 605 以上不处理图片旋转
      // alert(navigator.userAgent)
      if (this.getVersion('chrome')[0] >= 81) {
        orientation = -1
      } else {
        if (this.getVersion('safari')[0] >= 605) {
          const safariVersion = this.getVersion('version')
          if (safariVersion[0] > 13 && safariVersion[1] > 1) {
            orientation = -1
          }
        } else {
          //  判断 ios 版本进行处理
          // 针对 ios 版本大于 13.4的系统不做图片旋转
          const isIos = navigator.userAgent.toLowerCase().match(/cpu iphone os (.*?) like mac os/)
          if (isIos) {
            let version = isIos[1]
            version = version.split('_')
            if (version[0] > 13 || (version[0] >= 13 && version[1] >= 4)) {
              orientation = -1
            }
          }
        }
      }

      // alert(`当前处理的orientation${orientation}`)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.save()

      switch (orientation) {
        case 2:
          canvas.width = width
          canvas.height = height
          // horizontal flip
          ctx.translate(width, 0)
          ctx.scale(-1, 1)
          break
        case 3:
          canvas.width = width
          canvas.height = height
          // 180 graus
          ctx.translate(width / 2, height / 2)
          ctx.rotate((180 * Math.PI) / 180)
          ctx.translate(-width / 2, -height / 2)
          break
        case 4:
          canvas.width = width
          canvas.height = height
          // vertical flip
          ctx.translate(0, height)
          ctx.scale(1, -1)
          break
        case 5:
          // vertical flip + 90 rotate right
          canvas.height = width
          canvas.width = height
          ctx.rotate(0.5 * Math.PI)
          ctx.scale(1, -1)
          break
        case 6:
          canvas.width = height
          canvas.height = width
          // 90 graus
          ctx.translate(height / 2, width / 2)
          ctx.rotate((90 * Math.PI) / 180)
          ctx.translate(-width / 2, -height / 2)
          break
        case 7:
          // horizontal flip + 90 rotate right
          canvas.height = width
          canvas.width = height
          ctx.rotate(0.5 * Math.PI)
          ctx.translate(width, -height)
          ctx.scale(-1, 1)
          break
        case 8:
          canvas.height = width
          canvas.width = height
          // -90 graus
          ctx.translate(height / 2, width / 2)
          ctx.rotate((-90 * Math.PI) / 180)
          ctx.translate(-width / 2, -height / 2)
          break
        default:
          canvas.width = width
          canvas.height = height
      }

      ctx.drawImage(img, 0, 0, width, height)
      ctx.restore()
      canvas.toBlob(
        (blob) => {
          const data = URL.createObjectURL(blob)
          URL.revokeObjectURL(this.imgs)
          this.imgs = data
        },
        'image/' + this.outputType,
        1
      )
    },

    // checkout img
    checkedImg() {
      if (this.img === null || this.img === '') {
        this.imgs = ''
        this.clearCrop()
        return
      }
      this.loading = true
      this.scale = 1
      this.rotate = 0
      this.clearCrop()
      const img = new Image()
      img.onload = () => {
        if (this.img === '') {
          this.$emit('imgLoad', 'error')
          this.$emit('img-load', 'error')
          return false
        }

        let { width } = img
        let { height } = img
        exifmin.getData(img).then((data) => {
          this.orientation = data.orientation || 1
          const max = Number(this.maxImgSize)
          if (!this.orientation && (width < max) & (height < max)) {
            this.imgs = this.img
            return
          }

          if (width > max) {
            height = (height / width) * max
            width = max
          }

          if (height > max) {
            width = (width / height) * max
            height = max
          }
          this.checkOrientationImage(img, this.orientation, width, height)
        })
      }

      img.onerror = () => {
        this.$emit('imgLoad', 'error')
        this.$emit('img-load', 'error')
      }

      // 非 base64 图片需要先按跨域图片加载，避免后续 canvas 导出被污染。
      if (shouldUseAnonymousCrossOrigin(this.img)) {
        img.crossOrigin = 'Anonymous'
      }

      if (this.isIE) {
        const xhr = new XMLHttpRequest()
        xhr.onload = function () {
          const url = URL.createObjectURL(this.response)
          img.src = url
        }
        xhr.open('GET', this.img, true)
        xhr.responseType = 'blob'
        xhr.send()
      } else {
        img.src = this.img
      }
    },
    // 当按下鼠标键
    startMove(e) {
      e.preventDefault()
      // 如果move 为true 表示当前可以拖动
      if (this.move && !this.crop) {
        if (!this.canMove) {
          return false
        }
        // 开始移动
        this.moveX = ('clientX' in e ? e.clientX : e.touches[0].clientX) - this.x
        this.moveY = ('clientY' in e ? e.clientY : e.touches[0].clientY) - this.y
        if (e.touches) {
          this.$refs.editorDragBox.addEventListener('touchmove', this.moveImg)
          this.$refs.editorDragBox.addEventListener('touchend', this.leaveImg)
          if (e.touches.length == 2) {
            // 记录手指刚刚放上去
            this.touches = e.touches
            this.$refs.editorDragBox.addEventListener('touchmove', this.touchScale)
            this.$refs.editorDragBox.addEventListener('touchend', this.cancelTouchScale)
          }
        } else {
          this.$refs.editorDragBox.addEventListener('mousemove', this.moveImg)
          this.$refs.editorDragBox.addEventListener('mouseup', this.leaveImg)
        }
        // this.moveInfos = {
        //   x:e.clientX,
        //   y:e.clientY
        // }
        // console.log('moveImg------',e)
        // 触发图片移动事件
        this.$emit('imgMoving', {
          moving: true,
          axis: this.getImgAxis()
        })
        this.$emit('img-moving', {
          moving: true,
          axis: this.getImgAxis()
        })
      } else {
        // // 截图ing
        // this.cropping = true;
        // // 绑定截图事件
        // window.addEventListener("mousemove", this.createCrop);
        // window.addEventListener("mouseup", this.endCrop);
        // window.addEventListener("touchmove", this.createCrop);
        // window.addEventListener("touchend", this.endCrop);
        // this.cropOffsertX = e.offsetX
        //   ? e.offsetX
        //   : e.touches[0].pageX - this.$refs.editor.offsetLeft;
        // this.cropOffsertY = e.offsetY
        //   ? e.offsetY
        //   : e.touches[0].pageY - this.$refs.editor.offsetTop;
        // this.cropX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        // this.cropY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
        // this.cropChangeX = this.cropOffsertX;
        // this.cropChangeY = this.cropOffsertY;
        // this.cropW = 0;
        // this.cropH = 0;
      }
    },

    // 移动端缩放
    touchScale(e) {
      e.preventDefault()
      let { scale } = this
      // 记录变化量
      // 第一根手指
      const oldTouch1 = {
        x: this.touches[0].clientX,
        y: this.touches[0].clientY
      }
      const newTouch1 = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
      // 第二根手指
      const oldTouch2 = {
        x: this.touches[1].clientX,
        y: this.touches[1].clientY
      }
      const newTouch2 = {
        x: e.touches[1].clientX,
        y: e.touches[1].clientY
      }
      const oldL = Math.sqrt(Math.pow(oldTouch1.x - oldTouch2.x, 2) + Math.pow(oldTouch1.y - oldTouch2.y, 2))
      const newL = Math.sqrt(Math.pow(newTouch1.x - newTouch2.x, 2) + Math.pow(newTouch1.y - newTouch2.y, 2))
      const cha = newL - oldL
      // 根据图片本身大小 决定每次改变大小的系数, 图片越大系数越小
      // 1px - 0.2
      let coe = this.scalePi
      coe = coe / this.trueWidth > coe / this.trueHeight ? coe / this.trueHeight : coe / this.trueWidth
      coe = coe > 0.1 ? 0.1 : coe
      const num = coe * cha
      if (!this.touchNow) {
        this.touchNow = true
        if (cha > 0) {
          scale += Math.abs(num)
        } else if (cha < 0) {
          scale > Math.abs(num) ? (scale -= Math.abs(num)) : scale
        }
        this.touches = e.touches
        setTimeout(() => {
          this.touchNow = false
        }, 8)
        if (!this.checkoutImgAxis(this.x, this.y, scale)) {
          return false
        }
        this.scale = scale
      }
    },

    cancelTouchScale(e) {
      window.removeEventListener('touchmove', this.touchScale)
    },

    // 移动图片
    moveImg(e) {
      e.preventDefault()
      if (e.touches && e.touches.length === 2) {
        this.touches = e.touches
        this.$refs.editorDragBox.addEventListener('touchmove', this.touchScale)
        this.$refs.editorDragBox.addEventListener('touchend', this.cancelTouchScale)
        this.$refs.editorDragBox.removeEventListener('touchmove', this.moveImg)
        return false
      }
      this.imgMove(e)
    },
    // 截图框内的图片移动
    moveImgInCrop(e) {
      e.preventDefault()
      if (e.touches && e.touches.length === 2) {
        this.touches = e.touches
        this.$refs.editorMoveBox.addEventListener('touchmove', this.touchScale)
        this.$refs.editorMoveBox.addEventListener('touchend', this.cancelTouchScale)
        this.$refs.editorMoveBox.removeEventListener('touchmove', this.moveImgInCrop)
        return false
      }
      this.imgMove(e)
    },
    imgMove(e) {
      const nowX = 'clientX' in e ? e.clientX : e.touches[0].clientX
      const nowY = 'clientY' in e ? e.clientY : e.touches[0].clientY

      let changeX, changeY
      changeX = nowX - this.moveX
      changeY = nowY - this.moveY

      this.$nextTick(() => {
        if (this.centerBox) {
          const axis = this.getImgAxis(changeX, changeY, this.scale)
          const cropAxis = this.getCropAxis()
          const imgW = this.trueHeight * this.scale
          const imgH = this.trueWidth * this.scale
          let maxLeft, maxTop, maxRight, maxBottom
          switch (this.rotate) {
            case 1:
            case -1:
            case 3:
            case -3:
              maxLeft = this.cropOffsertX - (this.trueWidth * (1 - this.scale)) / 2 + (imgW - imgH) / 2
              maxTop = this.cropOffsertY - (this.trueHeight * (1 - this.scale)) / 2 + (imgH - imgW) / 2
              maxRight = maxLeft - imgW + this.cropW
              maxBottom = maxTop - imgH + this.cropH
              break
            default:
              maxLeft = this.cropOffsertX - (this.trueWidth * (1 - this.scale)) / 2
              maxTop = this.cropOffsertY - (this.trueHeight * (1 - this.scale)) / 2
              maxRight = maxLeft - imgH + this.cropW
              maxBottom = maxTop - imgW + this.cropH
              break
          }

          // 图片左边 图片不能超过截图框
          if (axis.x1 >= cropAxis.x1) {
            changeX = maxLeft
          }

          // 图片上边 图片不能超过截图框
          if (axis.y1 >= cropAxis.y1) {
            changeY = maxTop
          }

          // 图片右边
          if (axis.x2 <= cropAxis.x2) {
            changeX = maxRight
          }

          // 图片下边
          if (axis.y2 <= cropAxis.y2) {
            changeY = maxBottom
          }
        }
        this.x = changeX
        this.y = changeY
        // 触发图片移动事件
        this.$emit('imgMoving', {
          moving: true,
          axis: this.getImgAxis()
        })
        this.$emit('img-moving', {
          moving: true,
          axis: this.getImgAxis()
        })
      })
    },
    // 移动图片结束
    leaveImg(e) {
      this.$refs.editorDragBox.removeEventListener('mousemove', this.moveImg)
      this.$refs.editorDragBox.removeEventListener('touchmove', this.moveImg)
      this.$refs.editorDragBox.removeEventListener('mouseup', this.leaveImg)
      this.$refs.editorDragBox.removeEventListener('touchend', this.leaveImg)
      // 触发图片移动事件
      this.$emit('imgMoving', {
        moving: false,
        axis: this.getImgAxis()
      })
      this.$emit('img-moving', {
        moving: false,
        axis: this.getImgAxis()
      })
    },
    leaveImgInCrop(e) {
      this.$refs.editorMoveBox.removeEventListener('mousemove', this.moveImgInCrop)
      this.$refs.editorMoveBox.removeEventListener('touchmove', this.moveImgInCrop)
      this.$refs.editorMoveBox.removeEventListener('mouseup', this.leaveImgInCrop)
      this.$refs.editorMoveBox.removeEventListener('touchend', this.leaveImgInCrop)
      // 触发图片移动事件
      this.$emit('imgMoving', {
        moving: false,
        axis: this.getImgAxis()
      })
      this.$emit('img-moving', {
        moving: false,
        axis: this.getImgAxis()
      })
    },
    // 缩放图片
    scaleImg() {
      if (this.canScale) {
        window.addEventListener(this.support, this.changeSize, this.passive)
      }
    },
    // 移出框
    cancelScale() {
      if (this.canScale) {
        window.removeEventListener(this.support, this.changeSize)
      }
    },
    // 改变大小函数
    changeSize(e) {
      e.preventDefault()
      let { scale } = this
      let change = e.deltaY || e.wheelDelta
      // 根据图片本身大小 决定每次改变大小的系数, 图片越大系数越小
      const isFirefox = navigator.userAgent.indexOf('Firefox')
      change = isFirefox > 0 ? change * 30 : change
      // 修复ie的滚动缩放
      if (this.isIE) {
        change = -change
      }
      // 1px - 0.2
      let { coe } = this
      coe = coe / this.trueWidth > coe / this.trueHeight ? coe / this.trueHeight : coe / this.trueWidth
      const num = coe * change
      num < 0 ? (scale += Math.abs(num)) : scale > Math.abs(num) ? (scale -= Math.abs(num)) : scale
      // 延迟0.1s 每次放大大或者缩小的范围
      const status = num < 0 ? 'add' : 'reduce'
      if (status !== this.coeStatus) {
        this.coeStatus = status
        this.coe = 0.2
      }
      if (!this.scaling) {
        this.scalingSet = setTimeout(() => {
          this.scaling = false
          this.coe = this.coe += 0.01
        }, 50)
      }
      this.scaling = true
      if (!this.checkoutImgAxis(this.x, this.y, scale)) {
        return false
      }
      this.scale = scale
    },

    // 修改图片大小函数
    changeScale(num) {
      let { scale } = this
      num = num || 1
      let coe = 20
      coe = coe / this.trueWidth > coe / this.trueHeight ? coe / this.trueHeight : coe / this.trueWidth
      num = num * coe
      num > 0 ? (scale += Math.abs(num)) : scale > Math.abs(num) ? (scale -= Math.abs(num)) : scale
      if (!this.checkoutImgAxis(this.x, this.y, scale)) {
        return false
      }
      this.scale = scale
    },
    // 创建截图框
    createCrop(e) {
      e.preventDefault()
      // 移动生成大小
      const nowX = 'clientX' in e ? e.clientX : e.touches ? e.touches[0].clientX : 0
      const nowY = 'clientY' in e ? e.clientY : e.touches ? e.touches[0].clientY : 0
      this.$nextTick(() => {
        const fw = nowX - this.cropX
        const fh = nowY - this.cropY
        if (fw > 0) {
          this.cropW = fw + this.cropChangeX > this.w ? this.w - this.cropChangeX : fw
          this.cropOffsertX = this.cropChangeX
        } else {
          this.cropW = this.w - this.cropChangeX + Math.abs(fw) > this.w ? this.cropChangeX : Math.abs(fw)
          this.cropOffsertX = this.cropChangeX + fw > 0 ? this.cropChangeX + fw : 0
        }

        if (!this.fixed) {
          if (fh > 0) {
            this.cropH = fh + this.cropChangeY > this.h ? this.h - this.cropChangeY : fh
            this.cropOffsertY = this.cropChangeY
          } else {
            this.cropH = this.h - this.cropChangeY + Math.abs(fh) > this.h ? this.cropChangeY : Math.abs(fh)
            this.cropOffsertY = this.cropChangeY + fh > 0 ? this.cropChangeY + fh : 0
          }
        } else {
          const fixedHeight = (this.cropW / this.fixedNumber[0]) * this.fixedNumber[1]
          if (fixedHeight + this.cropOffsertY > this.h) {
            this.cropH = this.h - this.cropOffsertY
            this.cropW = (this.cropH / this.fixedNumber[1]) * this.fixedNumber[0]
            if (fw > 0) {
              this.cropOffsertX = this.cropChangeX
            } else {
              this.cropOffsertX = this.cropChangeX - this.cropW
            }
          } else {
            this.cropH = fixedHeight
          }
        }
      })
    },

    // 改变截图框大小
    changeCropSize(e, w, h, typeW, typeH) {
      e.preventDefault()
      this.$refs.editor.addEventListener('mousemove', this.changeCropNow)
      this.$refs.editor.addEventListener('mouseup', this.changeCropEnd)
      this.$refs.editor.addEventListener('touchmove', this.changeCropNow)
      this.$refs.editor.addEventListener('touchend', this.changeCropEnd)
      // console.log('----changeCropSize',e,this)
      this.canChangeX = w
      this.canChangeY = h
      this.changeCropTypeX = typeW
      this.changeCropTypeY = typeH
      this.cropX = 'clientX' in e ? e.clientX : e.touches[0].clientX
      this.cropY = 'clientY' in e ? e.clientY : e.touches[0].clientY
      this.cropOldW = this.cropW
      this.cropOldH = this.cropH
      this.cropChangeX = this.cropOffsertX
      this.cropChangeY = this.cropOffsertY
      if (this.fixed) {
        if (this.canChangeX && this.canChangeY) {
          this.canChangeY = 0
        }
      }
      this.$emit('change-crop-size', {
        width: this.cropW,
        height: this.cropH
      })
    },

    // 正在改变
    changeCropNow(e) {
      // console.log('----changeCropNow',e)
      e.preventDefault()
      const nowX = 'clientX' in e ? e.clientX : e.touches ? e.touches[0].clientX : 0
      const nowY = 'clientY' in e ? e.clientY : e.touches ? e.touches[0].clientY : 0
      // 容器的宽高
      let wrapperW = this.w
      let wrapperH = this.h

      // 不能超过的坐标轴
      let minX = 0
      let minY = 0

      if (this.centerBox) {
        const axis = this.getImgAxis()
        const imgW = axis.x2
        const imgH = axis.y2
        minX = axis.x1 > 0 ? axis.x1 : 0
        minY = axis.y1 > 0 ? axis.y1 : 0
        if (wrapperW > imgW) {
          wrapperW = imgW
        }

        if (wrapperH > imgH) {
          wrapperH = imgH
        }
      }

      this.$nextTick(() => {
        const fw = nowX - this.cropX
        const fh = nowY - this.cropY
        if (this.canChangeX) {
          if (this.changeCropTypeX === 1) {
            if (this.cropOldW - fw > 0) {
              this.cropW =
                wrapperW - this.cropChangeX - fw <= wrapperW - minX
                  ? this.cropOldW - fw
                  : this.cropOldW + this.cropChangeX - minX
              this.cropOffsertX = wrapperW - this.cropChangeX - fw <= wrapperW - minX ? this.cropChangeX + fw : minX
            } else {
              this.cropW =
                Math.abs(fw) + this.cropChangeX <= wrapperW
                  ? Math.abs(fw) - this.cropOldW
                  : wrapperW - this.cropOldW - this.cropChangeX
              this.cropOffsertX = this.cropChangeX + this.cropOldW
            }
          } else if (this.changeCropTypeX === 2) {
            if (this.cropOldW + fw > 0) {
              this.cropW =
                this.cropOldW + fw + this.cropOffsertX <= wrapperW ? this.cropOldW + fw : wrapperW - this.cropOffsertX
              this.cropOffsertX = this.cropChangeX
            } else {
              // 右侧坐标抽 超过左侧
              this.cropW =
                wrapperW - this.cropChangeX + Math.abs(fw + this.cropOldW) <= wrapperW - minX
                  ? Math.abs(fw + this.cropOldW)
                  : this.cropChangeX - minX
              this.cropOffsertX =
                wrapperW - this.cropChangeX + Math.abs(fw + this.cropOldW) <= wrapperW - minX
                  ? this.cropChangeX - Math.abs(fw + this.cropOldW)
                  : minX
            }
          }
        }

        if (this.canChangeY) {
          if (this.changeCropTypeY === 1) {
            if (this.cropOldH - fh > 0) {
              this.cropH =
                wrapperH - this.cropChangeY - fh <= wrapperH - minY
                  ? this.cropOldH - fh
                  : this.cropOldH + this.cropChangeY - minY
              this.cropOffsertY = wrapperH - this.cropChangeY - fh <= wrapperH - minY ? this.cropChangeY + fh : minY
            } else {
              this.cropH =
                Math.abs(fh) + this.cropChangeY <= wrapperH
                  ? Math.abs(fh) - this.cropOldH
                  : wrapperH - this.cropOldH - this.cropChangeY
              this.cropOffsertY = this.cropChangeY + this.cropOldH
            }
          } else if (this.changeCropTypeY === 2) {
            if (this.cropOldH + fh > 0) {
              this.cropH =
                this.cropOldH + fh + this.cropOffsertY <= wrapperH ? this.cropOldH + fh : wrapperH - this.cropOffsertY
              this.cropOffsertY = this.cropChangeY
            } else {
              this.cropH =
                wrapperH - this.cropChangeY + Math.abs(fh + this.cropOldH) <= wrapperH - minY
                  ? Math.abs(fh + this.cropOldH)
                  : this.cropChangeY - minY
              this.cropOffsertY =
                wrapperH - this.cropChangeY + Math.abs(fh + this.cropOldH) <= wrapperH - minY
                  ? this.cropChangeY - Math.abs(fh + this.cropOldH)
                  : minY
            }
          }
        }

        if (this.canChangeX && this.fixed) {
          const fixedHeight = (this.cropW / this.fixedNumber[0]) * this.fixedNumber[1]
          if (fixedHeight + this.cropOffsertY > wrapperH) {
            this.cropH = wrapperH - this.cropOffsertY
            this.cropW = (this.cropH / this.fixedNumber[1]) * this.fixedNumber[0]
          } else {
            this.cropH = fixedHeight
          }
        }

        if (this.canChangeY && this.fixed) {
          const fixedWidth = (this.cropH / this.fixedNumber[1]) * this.fixedNumber[0]
          if (fixedWidth + this.cropOffsertX > wrapperW) {
            this.cropW = wrapperW - this.cropOffsertX
            this.cropH = (this.cropW / this.fixedNumber[0]) * this.fixedNumber[1]
          } else {
            this.cropW = fixedWidth
          }
        }
        // 触发截图框改变大小事件
        this.$emit('crop-sizing', { cropW: this.cropW, cropH: this.cropH })
      })
    },

    checkCropLimitSize() {
      let { cropW, cropH, limitMinSize } = this

      let limitMinNum = []
      if (!Array.isArray[limitMinSize]) {
        limitMinNum = [limitMinSize, limitMinSize]
      } else {
        limitMinNum = limitMinSize
      }

      // 限制最小宽度和高度
      cropW = parseFloat(limitMinNum[0])
      cropH = parseFloat(limitMinNum[1])
      return [cropW, cropH]
    },
    // 结束改变
    changeCropEnd(e) {
      this.$refs.editor.removeEventListener('mousemove', this.changeCropNow)
      this.$refs.editor.removeEventListener('mouseup', this.changeCropEnd)
      this.$refs.editor.removeEventListener('touchmove', this.changeCropNow)
      this.$refs.editor.removeEventListener('touchend', this.changeCropEnd)
    },

    // 创建完成
    endCrop() {
      if (this.cropW === 0 && this.cropH === 0) {
        this.cropping = false
      }
      window.removeEventListener('mousemove', this.createCrop)
      window.removeEventListener('mouseup', this.endCrop)
      window.removeEventListener('touchmove', this.createCrop)
      window.removeEventListener('touchend', this.endCrop)
    },
    // 开始截图
    startCrop() {
      this.crop = true
    },
    // 停止截图
    stopCrop() {
      this.crop = false
    },
    // 清除截图
    clearCrop() {
      this.cropping = false
      this.cropW = 0
      this.cropH = 0
    },
    // 截图框内移动图片
    cropImgMove(e) {
      // 开始移动
      this.moveX = ('clientX' in e ? e.clientX : e.touches[0].clientX) - this.x
      this.moveY = ('clientY' in e ? e.clientY : e.touches[0].clientY) - this.y
      if (e.touches) {
        this.$refs.editorMoveBox.addEventListener('touchmove', this.moveImgInCrop)
        this.$refs.editorMoveBox.addEventListener('touchend', this.leaveImgInCrop)
        if (e.touches.length == 2) {
          // 记录手指刚刚放上去
          this.touches = e.touches
          this.$refs.editorMoveBox.addEventListener('touchmove', this.touchScale)
          this.$refs.editorMoveBox.addEventListener('touchend', this.cancelTouchScale)
        }
      } else {
        this.$refs.editorMoveBox.addEventListener('mousemove', this.moveImgInCrop)
        this.$refs.editorMoveBox.addEventListener('mouseup', this.leaveImgInCrop)
      }
      // this.moveInfos = {
      //   x:e.clientX,
      //   y:e.clientY
      // }
      // console.log('moveImg------',e)
      // 触发图片移动事件
      this.$emit('imgMoving', {
        moving: true,
        axis: this.getImgAxis()
      })
      this.$emit('img-moving', {
        moving: true,
        axis: this.getImgAxis()
      })
    },
    // 截图移动
    cropMove(e) {
      e.preventDefault()
      // 截图框如果不能移动的话就移动里面的图片，与图片的可移动只能二选1.优先框的移动(如果设置了框可移动的话)
      if (!this.canMoveBox) {
        this.crop = false
        this.cropImgMove(e)
        return false
      }

      if (e.touches && e.touches.length === 2) {
        this.crop = false
        this.cropImgMove(e)
        this.leaveCrop()
        return false
      }
      // 下面是移动框框的逻辑
      this.$refs.editorMoveBox.addEventListener('mousemove', this.moveCrop)
      this.$refs.editorMoveBox.addEventListener('mouseup', this.leaveCrop)
      this.$refs.editorMoveBox.addEventListener('touchmove', this.moveCrop)
      this.$refs.editorMoveBox.addEventListener('touchend', this.leaveCrop)
      const x = 'clientX' in e ? e.clientX : e.touches[0].clientX
      const y = 'clientY' in e ? e.clientY : e.touches[0].clientY
      let newX, newY
      newX = x - this.cropOffsertX
      newY = y - this.cropOffsertY
      this.cropX = newX
      this.cropY = newY
      // 触发截图框移动事件
      this.$emit('cropMoving', {
        moving: true,
        axis: this.getCropAxis()
      })
      this.$emit('crop-moving', {
        moving: true,
        axis: this.getCropAxis()
      })
    },

    moveCrop(e, isMove) {
      let nowX = 0
      let nowY = 0
      if (e) {
        e.preventDefault()
        nowX = 'clientX' in e ? e.clientX : e.touches[0].clientX
        nowY = 'clientY' in e ? e.clientY : e.touches[0].clientY
      }
      this.$nextTick(() => {
        let cx, cy
        let fw = nowX - this.cropX
        let fh = nowY - this.cropY
        if (isMove) {
          fw = this.cropOffsertX
          fh = this.cropOffsertY
        }
        // 不能超过外层容器
        if (fw <= 0) {
          cx = 0
        } else if (fw + this.cropW > this.w) {
          cx = this.w - this.cropW
        } else {
          cx = fw
        }

        if (fh <= 0) {
          cy = 0
        } else if (fh + this.cropH > this.h) {
          cy = this.h - this.cropH
        } else {
          cy = fh
        }

        // 不能超过图片
        if (this.centerBox) {
          const axis = this.getImgAxis()
          // 横坐标判断
          if (cx <= axis.x1) {
            cx = axis.x1
          }

          if (cx + this.cropW > axis.x2) {
            cx = axis.x2 - this.cropW
          }

          // 纵坐标纵轴
          if (cy <= axis.y1) {
            cy = axis.y1
          }

          if (cy + this.cropH > axis.y2) {
            cy = axis.y2 - this.cropH
          }
        }

        this.cropOffsertX = cx
        this.cropOffsertY = cy

        // 触发截图框移动事件
        this.$emit('cropMoving', {
          moving: true,
          axis: this.getCropAxis()
        })
        this.$emit('crop-moving', {
          moving: true,
          axis: this.getCropAxis()
        })
      })
    },

    // 算出不同场景下面 图片相对于外层容器的坐标轴
    getImgAxis(x, y, scale) {
      x = x || this.x
      y = y || this.y
      scale = scale || this.scale
      // 如果设置了截图框在图片内， 那么限制截图框不能超过图片的坐标
      // 图片的坐标
      const obj = {
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0
      }
      const imgW = this.trueWidth * scale
      const imgH = this.trueHeight * scale
      switch (this.rotate) {
        case 0:
          obj.x1 = x + (this.trueWidth * (1 - scale)) / 2
          obj.x2 = obj.x1 + this.trueWidth * scale
          obj.y1 = y + (this.trueHeight * (1 - scale)) / 2
          obj.y2 = obj.y1 + this.trueHeight * scale
          break
        case 1:
        case -1:
        case 3:
        case -3:
          obj.x1 = x + (this.trueWidth * (1 - scale)) / 2 + (imgW - imgH) / 2
          obj.x2 = obj.x1 + this.trueHeight * scale
          obj.y1 = y + (this.trueHeight * (1 - scale)) / 2 + (imgH - imgW) / 2
          obj.y2 = obj.y1 + this.trueWidth * scale
          break
        default:
          obj.x1 = x + (this.trueWidth * (1 - scale)) / 2
          obj.x2 = obj.x1 + this.trueWidth * scale
          obj.y1 = y + (this.trueHeight * (1 - scale)) / 2
          obj.y2 = obj.y1 + this.trueHeight * scale
          break
      }
      return obj
    },

    // 获取截图框的坐标轴
    getCropAxis() {
      const obj = {
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0
      }
      obj.x1 = this.cropOffsertX
      obj.x2 = obj.x1 + this.cropW
      obj.y1 = this.cropOffsertY
      obj.y2 = obj.y1 + this.cropH
      return obj
    },

    leaveCrop(e) {
      this.$refs.editorMoveBox.removeEventListener('mousemove', this.moveCrop)
      this.$refs.editorMoveBox.removeEventListener('mouseup', this.leaveCrop)
      this.$refs.editorMoveBox.removeEventListener('touchmove', this.moveCrop)
      this.$refs.editorMoveBox.removeEventListener('touchend', this.leaveCrop)
      // 触发截图框移动事件
      this.$emit('cropMoving', {
        moving: false,
        axis: this.getCropAxis()
      })
      this.$emit('crop-moving', {
        moving: false,
        axis: this.getCropAxis()
      })
    },

    getCropChecked(cb) {
      const canvas = document.createElement('canvas')
      const img = new Image()
      const { rotate } = this
      const { trueWidth } = this
      const { trueHeight } = this
      const { cropOffsertX } = this
      const { cropOffsertY } = this
      img.onload = () => {
        if (this.cropW !== 0) {
          const ctx = canvas.getContext('2d')
          let dpr = 1
          if (this.high & !this.full) {
            dpr = window.devicePixelRatio
          }
          if ((this.enlarge !== 1) & !this.full) {
            dpr = Math.abs(Number(this.enlarge))
          }
          const width = this.cropW * dpr
          const height = this.cropH * dpr
          const imgW = trueWidth * this.scale * dpr
          const imgH = trueHeight * this.scale * dpr
          // 图片x轴偏移
          let dx = (this.x - cropOffsertX + (this.trueWidth * (1 - this.scale)) / 2) * dpr
          // 图片y轴偏移
          let dy = (this.y - cropOffsertY + (this.trueHeight * (1 - this.scale)) / 2) * dpr
          // 保存状态
          setCanvasSize(width, height)
          ctx.save()
          switch (rotate) {
            case 0:
              if (!this.full) {
                ctx.drawImage(img, dx, dy, imgW, imgH)
              } else {
                // 输出原图比例截图
                setCanvasSize(width / this.scale, height / this.scale)
                ctx.drawImage(img, dx / this.scale, dy / this.scale, imgW / this.scale, imgH / this.scale)
              }
              break
            case 1:
            case -3:
              if (!this.full) {
                // 换算图片旋转后的坐标弥补
                dx = dx + (imgW - imgH) / 2
                dy = dy + (imgH - imgW) / 2
                ctx.rotate((rotate * 90 * Math.PI) / 180)
                ctx.drawImage(img, dy, -dx - imgH, imgW, imgH)
              } else {
                setCanvasSize(width / this.scale, height / this.scale)
                // 换算图片旋转后的坐标弥补
                dx = dx / this.scale + (imgW / this.scale - imgH / this.scale) / 2
                dy = dy / this.scale + (imgH / this.scale - imgW / this.scale) / 2
                ctx.rotate((rotate * 90 * Math.PI) / 180)
                ctx.drawImage(img, dy, -dx - imgH / this.scale, imgW / this.scale, imgH / this.scale)
              }
              break
            case 2:
            case -2:
              if (!this.full) {
                ctx.rotate((rotate * 90 * Math.PI) / 180)
                ctx.drawImage(img, -dx - imgW, -dy - imgH, imgW, imgH)
              } else {
                setCanvasSize(width / this.scale, height / this.scale)
                ctx.rotate((rotate * 90 * Math.PI) / 180)
                dx = dx / this.scale
                dy = dy / this.scale
                ctx.drawImage(
                  img,
                  -dx - imgW / this.scale,
                  -dy - imgH / this.scale,
                  imgW / this.scale,
                  imgH / this.scale
                )
              }
              break
            case 3:
            case -1:
              if (!this.full) {
                // 换算图片旋转后的坐标弥补
                dx = dx + (imgW - imgH) / 2
                dy = dy + (imgH - imgW) / 2
                ctx.rotate((rotate * 90 * Math.PI) / 180)
                ctx.drawImage(img, -dy - imgW, dx, imgW, imgH)
              } else {
                setCanvasSize(width / this.scale, height / this.scale)
                // 换算图片旋转后的坐标弥补
                dx = dx / this.scale + (imgW / this.scale - imgH / this.scale) / 2
                dy = dy / this.scale + (imgH / this.scale - imgW / this.scale) / 2
                ctx.rotate((rotate * 90 * Math.PI) / 180)
                ctx.drawImage(img, -dy - imgW / this.scale, dx, imgW / this.scale, imgH / this.scale)
              }
              break
            default:
              if (!this.full) {
                ctx.drawImage(img, dx, dy, imgW, imgH)
              } else {
                // 输出原图比例截图
                setCanvasSize(width / this.scale, height / this.scale)
                ctx.drawImage(img, dx / this.scale, dy / this.scale, imgW / this.scale, imgH / this.scale)
              }
          }
          ctx.restore()
        } else {
          const width = !this.full ? trueWidth * this.scale : trueWidth
          const height = !this.full ? trueHeight * this.scale : trueHeight
          const ctx = canvas.getContext('2d')
          ctx.save()
          switch (rotate) {
            case 0:
              setCanvasSize(width, height)
              ctx.drawImage(img, 0, 0, width, height)
              break
            case 1:
            case -3:
              // 旋转90度 或者-270度 宽度和高度对调
              setCanvasSize(height, width)
              ctx.rotate((rotate * 90 * Math.PI) / 180)
              ctx.drawImage(img, 0, -height, width, height)
              break
            case 2:
            case -2:
              setCanvasSize(width, height)
              ctx.rotate((rotate * 90 * Math.PI) / 180)
              ctx.drawImage(img, -width, -height, width, height)
              break
            case 3:
            case -1:
              setCanvasSize(height, width)
              ctx.rotate((rotate * 90 * Math.PI) / 180)
              ctx.drawImage(img, -width, 0, width, height)
              break
            default:
              setCanvasSize(width, height)
              ctx.drawImage(img, 0, 0, width, height)
          }
          ctx.restore()
        }
        cb(canvas, trueWidth, trueHeight)
      }
      // 判断图片是否是base64
      if (shouldUseAnonymousCrossOrigin(this.imgs)) {
        img.crossOrigin = 'Anonymous'
      }
      img.src = this.imgs

      function setCanvasSize(width, height) {
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
      }
    },

    // 获取转换成base64 的图片信息
    getCropData(cb, outputType) {
      const type = outputType || this.outputType
      this.getCropChecked((data, imgTrueWidth, imgTrueHeight) => {
        cb(data.toDataURL('image/' + type, this.outputSize), imgTrueWidth, imgTrueHeight)
      })
    },

    // canvas获取为blob对象
    getCropBlob(cb, outputType) {
      const type = outputType || this.outputType
      this.getCropChecked((data) => {
        data.toBlob((blob) => cb(blob), 'image/' + type, this.outputSize)
      })
    },

    // 自动预览函数
    showPreview() {
      // 优化不要多次触发
      if (this.isCanShow) {
        this.isCanShow = false
        setTimeout(() => {
          this.isCanShow = true
        }, 16)
      } else {
        return false
      }
      const w = this.cropW
      const h = this.cropH
      const { scale } = this
      const obj = {}
      obj.div = {
        width: `${w}px`,
        height: `${h}px`
      }
      const transformX = (this.x - this.cropOffsertX) / scale
      const transformY = (this.y - this.cropOffsertY) / scale
      const transformZ = 0
      obj.w = w
      obj.h = h
      obj.url = this.imgs
      obj.img = {
        width: `${this.trueWidth}px`,
        height: `${this.trueHeight}px`,
        transform: `scale(${scale})translate3d(${transformX}px, ${transformY}px, ${transformZ}px)rotateZ(${
          this.rotate * 90
        }deg)`
      }
      obj.html = `
        <div class="show-preview" style="width: ${obj.w}px; height: ${obj.h}px,; overflow: hidden">
          <div style="width: ${w}px; height: ${h}px">
            <img src=${obj.url} style="width: ${this.trueWidth}px; height: ${this.trueHeight}px; transform:
            scale(${scale})translate3d(${transformX}px, ${transformY}px, ${transformZ}px)rotateZ(${
              this.rotate * 90
            }deg)">
          </div>
        </div>`
      this.$emit('realTime', obj)
      this.$emit('real-time', obj)
    },
    // reload 图片布局函数
    reload() {
      const img = new Image()
      img.onload = () => {
        // 读取图片的信息原始信息， 解析是否需要旋转
        // 读取图片的旋转信息
        // 得到外层容器的宽度高度
        this.w = parseFloat(window.getComputedStyle(this.$refs.editor).width)
        this.h = parseFloat(window.getComputedStyle(this.$refs.editor).height)

        // 存入图片真实高度
        this.trueWidth = img.width
        this.trueHeight = img.height

        // 判断是否需要压缩大图
        if (!this.original) {
          // 判断布局方式 mode
          this.scale = this.checkedMode()
        } else {
          this.scale = 1
        }

        this.$nextTick(() => {
          this.x = -(this.trueWidth - this.trueWidth * this.scale) / 2 + (this.w - this.trueWidth * this.scale) / 2
          this.y = -(this.trueHeight - this.trueHeight * this.scale) / 2 + (this.h - this.trueHeight * this.scale) / 2
          this.loading = false
          // // 获取是否开启了自动截图
          if (this.autoCrop) {
            this.goAutoCrop()
          }
          // 图片加载成功的回调
          this.$emit('img-load', 'success')
          this.$emit('imgLoad', 'success')
          setTimeout(() => {
            this.showPreview()
          }, 20)
        })
      }
      img.onerror = () => {
        this.$emit('imgLoad', 'error')
        this.$emit('img-load', 'error')
      }
      img.src = this.imgs
    },
    // 背景布局的函数
    checkedMode() {
      let scale = 1
      // 防御：容器或图片尺寸未就绪时不做缩放
      if (!this.w || !this.h || !this.trueWidth || !this.trueHeight) return 1

      // 旋转 90/270 度时，图片在容器中的“外接矩形”宽高会互换
      const isRotateOdd = Math.abs(this.rotate) % 2 > 0
      const baseW = isRotateOdd ? this.trueHeight : this.trueWidth
      const baseH = isRotateOdd ? this.trueWidth : this.trueHeight
      // 通过字符串分割
      let imgW = this.trueWidth
      let imgH = this.trueHeight
      const arr = this.mode.split(' ')

      switch (arr[0]) {
        case 'contain':
          // 保持宽高比：整体缩放到「完全包含」在容器内，并且不放大（<=1）
          scale = Math.min(this.w / baseW, this.h / baseH, 1)
          break
        case 'cover':
          // 扩展布局：保持宽高比，至少覆盖容器（等价于 background-size: cover）
          // 旋转奇数角度时同样基于外接矩形尺寸计算
          scale = Math.max(this.w / baseW, this.h / baseH)
          break
        default:
          try {
            let str = arr[0]
            if (str.search('px') !== -1) {
              str = str.replace('px', '')
              imgW = parseFloat(str)
              const scaleX = imgW / this.trueWidth
              let scaleY = 1
              let strH = arr[1]
              if (strH.search('px') !== -1) {
                strH = strH.replace('px', '')
                imgH = parseFloat(strH)
                scaleY = imgH / this.trueHeight
              }
              scale = Math.min(scaleX, scaleY)
            }
            if (str.search('%') !== -1) {
              str = str.replace('%', '')
              imgW = (parseFloat(str) / 100) * this.w
              scale = imgW / this.trueWidth
            }

            if (arr.length === 2 && str === 'auto') {
              let str2 = arr[1]
              if (str2.search('px') !== -1) {
                str2 = str2.replace('px', '')
                imgH = parseFloat(str2)
                scale = imgH / this.trueHeight
              }
              if (str2.search('%') !== -1) {
                str2 = str2.replace('%', '')
                imgH = (parseFloat(str2) / 100) * this.h
                scale = imgH / this.trueHeight
              }
            }
          } catch (error) {
            scale = 1
          }
      }
      return scale
    },
    // 自动截图函数
    goAutoCrop(cw, ch) {
      if (this.imgs === '' || this.imgs === null) return

      // 继续操作的时候 缩放改成1
      this.scale = this.checkedMode()

      this.clearCrop()
      this.cropping = true
      let maxWidth = this.w
      console.log('🚀 ~ this.w:', this.w)

      let maxHeight = this.h
      console.log('🚀 ~ this.h:', this.h)

      const { h: containerHeight } = this
      if (this.centerBox) {
        const switchWH = Math.abs(this.rotate) % 2 > 0
        const imgW = (switchWH ? this.trueHeight : this.trueWidth) * this.scale
        const imgH = (switchWH ? this.trueWidth : this.trueHeight) * this.scale
        maxWidth = imgW < maxWidth ? imgW : maxWidth
        maxHeight = imgH < maxHeight ? imgH : maxHeight
      }
      // 截图框默认大小
      // 如果为0 那么计算容器大小 默认为80%
      let w = cw || parseFloat(this.autoCropWidth)
      console.log('🚀 ~ w:', w)

      let h = ch || parseFloat(this.autoCropHeight)
      console.log('🚀 ~ h:', h)

      if (w === 0 || h === 0) {
        w = maxWidth * 1
        h = maxHeight * 1
      }
      w = w > maxWidth ? maxWidth : w
      h = h > maxHeight ? maxHeight : h

      console.log('🚀 ~ w, h:', w, h)

      if (this.fixed) {
        h = (w / this.fixedNumber[0]) * this.fixedNumber[1]
      }
      // 如果比例之后 高度大于h
      if (h > containerHeight) {
        h = containerHeight
        w = (h / this.fixedNumber[1]) * this.fixedNumber[0]
      }

      console.log('🚀 ~ w, h:', w, h)

      this.changeCrop(w, h)
    },
    // 手动改变截图框大小函数
    changeCrop(w, h) {
      if (this.centerBox) {
        // 修复初始化时候在centerBox=true情况下
        const axis = this.getImgAxis()
        console.log('🚀 ~ axis:', axis)

        if (w > axis.x2 - axis.x1) {
          // 宽度超标
          w = axis.x2 - axis.x1
          if (this.fixed) {
            h = (w / this.fixedNumber[0]) * this.fixedNumber[1]
          }
        }
        if (h > axis.y2 - axis.y1) {
          // 高度超标
          h = axis.y2 - axis.y1
          if (this.fixed) {
            w = (h / this.fixedNumber[1]) * this.fixedNumber[0]
          }
        }
      }
      // 判断是否大于容器
      this.cropW = w
      this.cropH = h
      this.checkCropLimitSize()
      this.$nextTick(() => {
        // 居中走一走
        this.cropOffsertX = (this.w - this.cropW) / 2
        this.cropOffsertY = (this.h - this.cropH) / 2
        if (this.centerBox) {
          this.moveCrop(null, true)
        }
      })
    },
    // 重置函数， 恢复组件置初始状态
    refresh() {
      const { img } = this
      this.imgs = ''
      this.scale = 1
      this.crop = false
      this.rotate = 0
      this.w = 0
      this.h = 0
      this.trueWidth = 0
      this.trueHeight = 0
      this.clearCrop()
      this.$nextTick(() => {
        this.checkedImg()
      })
    },

    // 向左边旋转
    rotateLeft() {
      // console.log('rotateLeft-------')
      this.rotate = this.rotate <= -3 ? 0 : this.rotate - 1
      // 继续操作的时候 缩放改成1
      this.scale = this.checkedMode()
    },

    // 向右边旋转
    rotateRight() {
      this.rotate = this.rotate >= 3 ? 0 : this.rotate + 1
      console.log('🚀 ~ this.rotate:', this.rotate)

      // 继续操作的时候 缩放改成1
      this.scale = this.checkedMode()
    },

    // 清除旋转
    rotateClear() {
      this.rotate = 0
    },

    // 图片坐标点校验
    checkoutImgAxis(x, y, scale) {
      x = x || this.x
      y = y || this.y
      scale = scale || this.scale
      let canGo = true
      // 开始校验 如果说缩放之后的坐标在截图框外 则阻止缩放
      if (this.centerBox) {
        const axis = this.getImgAxis(x, y, scale)
        const cropAxis = this.getCropAxis()
        // 左边的横坐标 图片不能超过截图框
        if (axis.x1 >= cropAxis.x1) {
          canGo = false
        }

        // 右边横坐标
        if (axis.x2 <= cropAxis.x2) {
          canGo = false
        }

        // 纵坐标上面
        if (axis.y1 >= cropAxis.y1) {
          canGo = false
        }

        // 纵坐标下面
        if (axis.y2 <= cropAxis.y2) {
          canGo = false
        }
      }
      return canGo
    }
  },
  mounted() {
    this.support =
      'onwheel' in document.createElement('div')
        ? 'wheel'
        : document.onmousewheel !== undefined
          ? 'mousewheel'
          : 'DOMMouseScroll'
    const that = this
    const u = navigator.userAgent
    this.isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
    // 兼容blob
    if (!HTMLCanvasElement.prototype.toBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function (callback, type, quality) {
          const binStr = atob(this.toDataURL(type, quality).split(',')[1])
          const len = binStr.length
          const arr = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            arr[i] = binStr.charCodeAt(i)
          }
          callback(new Blob([arr], { type: that.type || 'image/png' }))
        }
      })
    }
    this.showPreview()
    this.checkedImg()
  },
  unmounted() {
    window.removeEventListener('mousemove', this.moveCrop)
    window.removeEventListener('mouseup', this.leaveCrop)
    window.removeEventListener('touchmove', this.moveCrop)
    window.removeEventListener('touchend', this.leaveCrop)
    this.cancelScale()
  }
}
</script>

<style scoped lang="scss">
.image-editor {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  direction: ltr;
  touch-action: none;
  text-align: left;
}

.editor-box,
.editor-box-canvas,
.editor-drag-box,
.editor-crop-box,
.editor-face {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  user-select: none;
}
.editor-box-canvas {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC');
}

.editor-box-canvas img {
  position: relative;
  text-align: left;
  user-select: none;
  transform: none;
  max-width: none;
  max-height: none;
}

.editor-box {
  overflow: hidden;
}

.editor-move {
  cursor: move;
}

.editor-crop {
  cursor: crosshair;
}

.editor-modal {
  background: rgba(0, 0, 0, 0.5);
}

.editor-crop-box {
  /*border: 2px solid #39f;*/
}

.editor-view-box {
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
  outline: 1px solid #39f;
  outline-color: rgba(51, 153, 255, 0.75);
  user-select: none;
}

.editor-view-box img {
  user-select: none;
  text-align: left;
  max-width: none;
  max-height: none;
}

.editor-face {
  top: 0;
  left: 0;
  background-color: #fff;
  opacity: 0.1;
}

.crop-info {
  position: absolute;
  left: 0px;
  min-width: 65px;
  text-align: center;
  color: white;
  line-height: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  font-size: 12px;
}

.crop-line {
  position: absolute;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0.1;
}

.line-w {
  top: -3px;
  left: 0;
  height: 5px;
  cursor: n-resize;
}

.line-a {
  top: 0;
  left: -3px;
  width: 5px;
  cursor: w-resize;
}

.line-s {
  bottom: -3px;
  left: 0;
  height: 5px;
  cursor: s-resize;
}

.line-d {
  top: 0;
  right: -3px;
  width: 5px;
  cursor: e-resize;
}

.crop-point {
  position: absolute;
  width: px2vw(30);
  height: px2vw(30);
  opacity: 0;
  background-color: #39f;
  border-radius: 100%;
  z-index: 523;
}

.point1 {
  top: - px2vw(15);
  left: - px2vw(15);
  cursor: nw-resize;
}

.point2 {
  top: - px2vw(15);
  left: 50%;
  margin-left: - px2vw(15);
  cursor: n-resize;
}

.point3 {
  top: - px2vw(15);
  right: - px2vw(15);
  cursor: ne-resize;
}

.point4 {
  top: 50%;
  left: - px2vw(15);
  margin-top: - px2vw(15);
  cursor: w-resize;
}

.point5 {
  top: 50%;
  right: - px2vw(15);
  margin-top: - px2vw(15);
  cursor: e-resize;
}

.point6 {
  bottom: - px2vw(15);
  left: - px2vw(15);
  cursor: sw-resize;
}

.point7 {
  bottom: - px2vw(15);
  left: 50%;
  margin-left: - px2vw(15);
  cursor: s-resize;
}

.point8 {
  bottom: - px2vw(15);
  right: - px2vw(15);
  cursor: se-resize;
}

@media screen and (max-width: 500px) {
  .crop-point {
    position: absolute;
    width: px2vw(30);
    height: px2vw(30);
    opacity: 0;
    background-color: #39f;
    border-radius: 100%;
  }
}
.crop-point-line {
  position: absolute;
  background-color: rgb(255, 255, 255);
  z-index: 522;
  opacity: 1;
}
.crop-point-line-h {
  width: px2vw(30);
  height: px2vw(4);
}
.crop-point-line-v {
  width: px2vw(4);
  height: px2vw(30);
}
.top-left {
  top: - px2vw(4);
  left: - px2vw(4);
}
.top-center {
  top: - px2vw(4);
  left: 50%;
  margin-left: - px2vw(15);
}
.top-right {
  top: - px2vw(4);
  right: - px2vw(4);
}
.bottom-left {
  bottom: - px2vw(4);
  left: - px2vw(4);
}
.bottom-center {
  bottom: - px2vw(4);
  left: 50%;
  margin-left: - px2vw(15);
}
.bottom-right {
  bottom: - px2vw(4);
  right: - px2vw(4);
}

.left-center {
  left: - px2vw(4);
  top: 50%;
  margin-top: - px2vw(15);
}
.right-center {
  right: - px2vw(4);
  top: 50%;
  margin-top: - px2vw(15);
}
</style>
