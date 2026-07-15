<template>
	<view class="page">
		<view class="web-view"></view>
		<view class="page-container">
			<view class="title">
				<text>选择生肖</text>
			</view>
			<view class="font">
				<view
					v-for="item in 12"
					:key="item"
					class="font-item"
					:class="type === item ? 'ischoice' : ''"
					@click="selectType(item)"
				>
					<image :src="getAnimalSrc(item)" class="customer" />
					<text>{{ animal[item].name }}</text>
				</view>
			</view>
			<view class="title">
				<text>输入出生年月日</text>
			</view>
			<picker
				mode="date"
				fields="day"
				:value="selectDate"
				start="1900-01-01"
				end="2099-12-31"
				@change="onDateChange"
			>
				<view class="input-box">
					{{ selectDate || '请选择年月日' }}
				</view>
			</picker>
			<button @click="onSubmit">提交</button>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { zodiacApi } from '@/api'

const type = ref(0)
const selectDate = ref('2026-07-10')

const animal = [
	{ type: 1,  name: '鼠' },
	{ type: 2,  name: '牛' },
	{ type: 3,  name: '虎' },
	{ type: 4,  name: '兔' },
	{ type: 5,  name: '龙' },
	{ type: 6,  name: '蛇' },
	{ type: 7,  name: '马' },
	{ type: 8,  name: '羊' },
	{ type: 9,  name: '猴' },
	{ type: 10, name: '鸡' },
	{ type: 11, name: '狗' },
	{ type: 12, name: '猪' },
]

// 动态加载生肖图片
const imageModules = import.meta.glob('@/pages/my/aseets/animal*.png', { eager: true, import: 'default' })
const animalImageMap = Object.fromEntries(
	Object.entries(imageModules)
		.map(([path, url]) => {
			const match = path.match(/animal(\d+)\.png$/)
			return match ? [Number(match[1]), url] : null
		})
		.filter(Boolean),
)

function getAnimalSrc(item) {
	return animalImageMap[1 + Number(item)] || ''
}

function selectType(item) {
	type.value = item
}

function onDateChange(e) {
	selectDate.value = e.detail?.value || e.target?.value || ''
}

function onSubmit() {
	// TODO: 提交逻辑
}
</script>

<style lang="scss" scoped>
	.page {
		height: 100vh;
		padding: 0 32rpx;
	}

	.web-view {
		height: 440rpx;
		background: #D9D9D9;
		width: 440rpx;
		// margin: auto;
		margin: 28rpx auto;

	}

	.page-container {
		display: flex;
		flex-direction: column;
		gap: 28rpx;

		.title {
			font-weight: bold;
			font-size: 32rpx;
			color: #000000;
			border-left: 8rpx solid #CC343A;

			text {
				margin-left: 16rpx;
			}
		}

		button {
			width: 90%;
			margin-top: 40rpx;
			background: #D90226;
			color: #fff;
			border-radius: 10rpx;
			height: 92rpx;
			line-height: 92rpx;
			font-weight: bold;
		}

		.font {
			display: grid;
			grid-template-columns: repeat(6, 1fr);
			gap: 22rpx;

			.font-item {
				aspect-ratio: 1 / 1;
				color: #5F5F5F;
				background-color: #E7E7E7;
				display: flex;
				flex-direction: column;
				justify-content: space-between;
				align-items: center;
				padding: 20rpx;
				font-weight: bold;

				image {
					width: 36rpx;
					height: 36rpx;
				}

				text {
					font-size: 24rpx;
				}
			}

			.ischoice {
				border: 1px solid #CC343A;
				background-color: #fff;
			}
		}
	}
</style>