<div align="center">
  <h1 align="center">MixFile-AList</h1>
  <p align="center">
    MixFile自定义线路-AList多线路
  </p>
</div>

## 使用

1. 安装[nodejs](https://nodejs.org/)，下载项目，在项目根目录安装依赖
   
   ```shell
   npm i
   ```

2. 复制`.env.example`文件为`.env`文件，修改`.env`文件内的变量的值，或在终端中设置相应环境变量

3. 启动项目
   
   ```shell
   node app
   ```

4. 在Mixfile中将上传线路更改为自定义线路，并填写请求地址为`URL/SUFFIX`，例如：`http://192.168.1.101:5001/line1secret`

## 说明

image为图片,可自定义逻辑返回自定义图片,可返回随机图片(一个文件上传时只会访问一次图片)

如果需要mixfile在失败时重试,请返回500状态码

## 链接

- Mixfile安卓APP：[GitHub - InvertGeek/MixFile: 使用图床储存任意文件](https://github.com/InvertGeek/MixFile)

- Mixfile命令行：[GitHub - InvertGeek/mixfilecli: MixFile命令行版本](https://github.com/InvertGeek/mixfilecli)

- Mixfile自定义线路例子：[GitHub - InvertGeek/mixfileexamplejs](https://github.com/InvertGeek/mixfileexamplejs)