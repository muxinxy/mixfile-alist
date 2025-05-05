# token获取

> 获取某个用户的临时JWt token，默认48小时过期

## OpenAPI

```yaml
openapi: 3.0.1
info:
 title: ''
 description: ''
 version: 1.0.0
paths:
 /api/auth/login:
 post:
 summary: token获取
 deprecated: false
 description: 获取某个用户的临时JWt token，默认48小时过期
 tags:
 - auth
 - alist Copy/auth
 parameters: []
 requestBody:
 content:
 application/json:
 schema:
 type: object
 properties:
 username:
 type: string
 title: 用户名
 description: 用户名
 password:
 type: string
 title: 密码
 description: 密码
 otp_code:
 type: string
 title: 二步验证码
 description: 二步验证码
 x-apifox-orders:
 - username
 - password
 - otp_code
 required:
 - username
 - password
 example:
 username: '{{alist_username}}'
 password: '{{alist_password}}'
 responses:
 '200':
 description: ''
 content:
 application/json:
 schema:
 type: object
 properties:
 code:
 type: integer
 description: 状态码
 message:
 type: string
 description: 信息
 data:
 type: object
 properties:
 token:
 type: string
 description: token
 required:
 - token
 x-apifox-orders:
 - token
 description: data
 required:
 - code
 - message
 - data
 x-apifox-orders:
 - code
 - message
 - data
 example:
 code: 200
 message: success
 data:
 token: abcd
 headers: {}
 x-apifox-name: 成功
 security: []
 x-apifox-folder: auth
 x-apifox-status: released
 x-run-in-apifox: https://app.apifox.com/web/project/3653728/apis/api-128101241-run
components:
 schemas: {}
 securitySchemes: {}
servers:
 - url: http://test-cn.your-api-server.com
 description: 测试环境
 - url: http://prod-cn.your-api-server.com
 description: 正式环境
security: []
```

# 获取某个文件/目录信息

## OpenAPI

```yaml
openapi: 3.0.1
info:
 title: ''
 description: ''
 version: 1.0.0
paths:
 /api/fs/get:
 post:
 summary: 获取某个文件/目录信息
 deprecated: false
 description: ''
 tags:
 - fs
 - alist Copy/fs
 parameters:
 - name: Authorization
 in: header
 description: ''
 required: true
 example: '{{alist_token}}'
 schema:
 type: string
 requestBody:
 content:
 application/json:
 schema:
 type: object
 properties:
 path:
 type: string
 title: 路径
 password:
 type: string
 title: 密码
 page:
 type: integer
 per_page:
 type: integer
 refresh:
 type: boolean
 title: 强制 刷新
 required:
 - path
 - password
 x-apifox-orders:
 - path
 - password
 - page
 - per_page
 - refresh
 example:
 path: /t
 password: ''
 page: 1
 per_page: 0
 refresh: false
 responses:
 '200':
 description: ''
 content:
 application/json:
 schema:
 type: object
 properties:
 code:
 type: integer
 title: 状态码
 message:
 type: string
 title: 信息
 data:
 type: object
 properties:
 name:
 type: string
 title: 文件名
 size:
 type: integer
 title: 大小
 is_dir:
 type: boolean
 title: 是否是文件夹
 modified:
 type: string
 title: 修改时间
 created:
 type: string
 title: 创建时间
 sign:
 type: string
 title: 签名
 thumb:
 type: string
 title: 缩略图
 type:
 type: integer
 title: 类型
 hashinfo:
 type: string
 hash_info:
 type: 'null'
 raw_url:
 type: string
 title: 原始url
 readme:
 type: string
 title: 说明
 header:
 type: string
 provider:
 type: string
 related:
 type: 'null'
 required:
 - name
 - size
 - is_dir
 - modified
 - created
 - sign
 - thumb
 - type
 - hashinfo
 - hash_info
 - raw_url
 - readme
 - header
 - provider
 - related
 x-apifox-orders:
 - name
 - size
 - is_dir
 - modified
 - sign
 - thumb
 - type
 - raw_url
 - readme
 - provider
 - related
 - created
 - hashinfo
 - hash_info
 - header
 required:
 - code
 - message
 - data
 x-apifox-orders:
 - code
 - message
 - data
 example:
 code: 200
 message: success
 data:
 name: Alist V3.md
 size: 2618
 is_dir: false
 modified: '2024-05-17T16:05:36.4651534+08:00'
 created: '2024-05-17T16:05:29.2001008+08:00'
 sign: ''
 thumb: ''
 type: 4
 hashinfo: 'null'
 hash_info: null
 raw_url: http://127.0.0.1:5244/p/local/Alist%20V3.md
 readme: ''
 header: ''
 provider: Local
 related: null
 headers: {}
 x-apifox-name: 成功
 security: []
 x-apifox-folder: fs
 x-apifox-status: released
 x-run-in-apifox: https://app.apifox.com/web/project/3653728/apis/api-128101247-run
components:
 schemas: {}
 securitySchemes: {}
servers:
 - url: http://test-cn.your-api-server.com
 description: 测试环境
 - url: http://prod-cn.your-api-server.com
 description: 正式环境
security: [] 
```

# 流式上传文件

## OpenAPI

```yaml
openapi: 3.0.1
info:
 title: ''
 description: ''
 version: 1.0.0
paths:
 /api/fs/put:
 put:
 summary: 流式上传文件
 deprecated: false
 description: ''
 tags:
 - fs
 - alist Copy/fs
 parameters:
 - name: Authorization
 in: header
 description: ''
 required: true
 example: '{{alist_token}}'
 schema:
 type: string
 - name: File-Path
 in: header
 description: 经过URL编码的完整目标文件路径
 required: true
 example: ''
 schema:
 type: string
 - name: As-Task
 in: header
 description: 是否添加为任务
 required: false
 example: 'true'
 schema:
 type: string
 - name: Content-Type
 in: header
 description: ''
 required: true
 example: ''
 schema:
 type: string
 - name: Content-Length
 in: header
 description: ''
 required: true
 example: ''
 schema:
 type: string
 requestBody:
 content:
 application/octet-stream:
 schema:
 type: string
 format: binary
 responses:
 '200':
 description: ''
 content:
 application/json:
 schema:
 type: object
 properties:
 code:
 type: integer
 title: 状态码
 message:
 type: string
 title: 信息
 data:
 type: object
 properties:
 task:
 type: object
 properties:
 id:
 type: string
 name:
 type: string
 state:
 type: integer
 status:
 type: string
 progress:
 type: integer
 error:
 type: string
 required:
 - id
 - name
 - state
 - status
 - progress
 - error
 x-apifox-orders:
 - id
 - name
 - state
 - status
 - progress
 - error
 required:
 - task
 x-apifox-orders:
 - task
 required:
 - code
 - message
 - data
 x-apifox-orders:
 - code
 - message
 - data
 example:
 code: 200
 message: success
 data:
 task:
 id: sdH2LbjyWRk
 name: upload animated_zoom.gif to [/data](/alist)
 state: 0
 status: uploading
 progress: 0
 error: ''
 headers: {}
 x-apifox-name: 成功
 security: []
 x-apifox-folder: fs
 x-apifox-status: released
 x-run-in-apifox: https://app.apifox.com/web/project/3653728/apis/api-128101260-run
components:
 schemas: {}
 securitySchemes: {}
servers:
 - url: http://test-cn.your-api-server.com
 description: 测试环境
 - url: http://prod-cn.your-api-server.com
 description: 正式环境
security: []
```
