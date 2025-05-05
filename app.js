import express from "express";
import axios from "axios";
import path from 'path';
import { fileURLToPath } from 'url';
import logger from "morgan";
import fs from 'fs/promises';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取当前模块的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 基础配置
const SERVER_PORT = process.env.SERVER_PORT || 5001;
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const DEBUG_VERBOSE = process.env.DEBUG_VERBOSE === 'true';
const INITIAL_WAIT_MS = parseInt(process.env.INITIAL_WAIT_MS || '500');
const RETRY_WAIT_MS = parseInt(process.env.RETRY_WAIT_MS || '500');

// 多线路配置处理
const ROUTES_CONFIG = parseRoutesConfig();
console.log("加载的线路配置:", ROUTES_CONFIG.map(r => ({id: r.id, suffix: r.suffix})));

function parseRoutesConfig() {
    const routes = [];
    let routeIndex = 1;
    
    // 检查环境变量中的线路配置
    while (true) {
        const baseKey = `ROUTE_${routeIndex}`;
        const apiUrlKey = `${baseKey}_API_URL`;
        const suffixKey = `${baseKey}_SUFFIX`;
        
        // 检查当前索引的线路是否存在
        if (!process.env[apiUrlKey]) {
            break; // 不存在更多的线路配置
        }
        
        // 提取线路配置
        routes.push({
            id: routeIndex,
            api_url: process.env[apiUrlKey],
            suffix: process.env[suffixKey] || '', // 线路后缀，可选
            username: process.env[`${baseKey}_USERNAME`] || 'admin',
            password: process.env[`${baseKey}_PASSWORD`] || 'password',
            upload_path: process.env[`${baseKey}_UPLOAD_PATH`] || '/',
            absolute_path: process.env[`${baseKey}_ABSOLUTE_PATH`] || '',
            token: null, // 初始token为null
            tokenExpiration: 0 // token过期时间
        });
        
        routeIndex++;
    }
    
    // 如果没有配置线路，添加默认线路
    if (routes.length === 0) {
        routes.push({
            id: 1,
            api_url: process.env.ALIST_API_URL || 'http://localhost:5244',
            suffix: process.env.DEFAULT_SUFFIX || '',
            username: process.env.ALIST_USERNAME || 'admin',
            password: process.env.ALIST_PASSWORD || 'password',
            upload_path: process.env.UPLOAD_PATH || '/',
            absolute_path: process.env.ABSOLUTE_PATH || '',
            token: null,
            tokenExpiration: 0
        });
    }
    
    return routes;
}

// 创建Express应用
const app = express();

// 中间件设置
app.use(logger(DEBUG_MODE ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.raw({type: '*/*', limit: '50mb'}));
app.use(express.urlencoded({extended: false}));

// 调试日志函数
function debugLog(message, data = null) {
    if (!DEBUG_MODE) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`);
    
    // 详细模式下才输出数据
    if (data && DEBUG_VERBOSE) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// 根据后缀查找对应的线路配置
function findRouteByPathSuffix(reqPath) {
    // 获取请求路径
    const pathSegments = reqPath.split('/').filter(seg => seg !== '');
    
    // 检查是否有后缀匹配任何线路
    for (const route of ROUTES_CONFIG) {
        // 如果线路没有后缀，跳过
        if (!route.suffix) continue;
        
        // 检查请求路径是否匹配此线路的后缀
        if (pathSegments.length > 0 && pathSegments[0] === route.suffix) {
            debugLog(`找到匹配的线路: ${route.id}, 后缀: ${route.suffix}`);
            return {
                route,
                remainingPath: `/${pathSegments.slice(1).join('/')}`
            };
        }
    }
    
    // 如果没有匹配的线路，尝试使用默认线路（没有后缀的第一个线路）
    const defaultRoute = ROUTES_CONFIG.find(r => !r.suffix) || ROUTES_CONFIG[0];
    
    if (defaultRoute) {
        debugLog(`使用默认线路: ${defaultRoute.id}`);
        return {
            route: defaultRoute,
            remainingPath: reqPath
        };
    }
    
    return null;
}

// 获取 AList 认证 token
async function getAlistToken(route) {
    // 检查当前 token 是否有效
    if (route.token && route.tokenExpiration > Date.now()) {
        debugLog(`使用缓存的 token (线路 ${route.id}), ${Math.floor((route.tokenExpiration - Date.now()) / 1000)} 秒后过期`);
        return route.token;
    }
    
    try {
        debugLog(`从 ${route.api_url}/api/auth/login 请求新 token (线路 ${route.id})`);
        
        const response = await axios.post(`${route.api_url}/api/auth/login`, {
            username: route.username,
            password: route.password
        });
        
        debugLog(`线路 ${route.id} token 请求响应:`, response.data);
        
        if (response.data.code === 200 && response.data.data.token) {
            route.token = response.data.data.token;
            // 设置 token 有效期为 47 小时 (小于 AList 默认的 48 小时)
            route.tokenExpiration = Date.now() + 47 * 60 * 60 * 1000;
            debugLog(`线路 ${route.id} token 获取成功，将在 ${new Date(route.tokenExpiration).toISOString()} 过期`);
            return route.token;
        } else {
            console.error(`线路 ${route.id} 获取 AList token 失败:`, response.data);
            throw new Error('认证失败');
        }
    } catch (error) {
        console.error(`线路 ${route.id} 获取 AList token 错误:`, error.message);
        if (error.response && DEBUG_MODE) {
            debugLog("错误响应数据:", error.response.data);
        }
        throw error;
    }
}

// 获取文件信息
async function getFileInfo(route, filePath) {
    try {
        const token = await getAlistToken(route);
        
        const requestData = {
            path: filePath,
            password: '',
            page: 1,
            per_page: 0,
            refresh: true  // 设置为true以刷新缓存
        };
        
        debugLog(`获取文件信息，路径: ${filePath}, 线路: ${route.id}`);
        debugLog(`请求 ${route.api_url}/api/fs/get 数据:`, requestData);
        
        const response = await axios.post(
            `${route.api_url}/api/fs/get`,
            requestData,
            {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        debugLog(`线路 ${route.id} 文件信息响应:`, response.data);
        
        if (response.data.code === 200) {
            debugLog(`线路 ${route.id} 文件信息获取成功:`, response.data.data);
            return response.data.data;
        } else {
            console.error(`线路 ${route.id} 获取文件信息失败:`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`线路 ${route.id} 获取文件信息错误:`, error.message);
        if (error.response && DEBUG_MODE) {
            debugLog("错误响应数据:", error.response.data);
        } else if (DEBUG_MODE) {
            debugLog("没有收到服务器响应");
        }
        return null;
    }
}

// 列出目录内容
async function listDirectory(route, dirPath) {
    try {
        const token = await getAlistToken(route);
        
        // 确保目录路径格式正确
        const normalizedDirPath = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
        
        debugLog(`列出目录: ${normalizedDirPath}, 线路: ${route.id}`);
        
        const requestData = {
            path: normalizedDirPath,
            password: '',
            page: 1,
            per_page: 100,
            refresh: true  // 强制刷新目录缓存
        };
        
        debugLog(`请求 ${route.api_url}/api/fs/list 数据:`, requestData);
        
        const response = await axios.post(
            `${route.api_url}/api/fs/list`,
            requestData,
            {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        debugLog(`线路 ${route.id} 目录列表响应:`, response.data);
        
        if (response.data.code === 200 && response.data.data.content) {
            return response.data.data.content;
        } else {
            console.error(`线路 ${route.id} 列出目录失败:`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`线路 ${route.id} 列出目录错误:`, error.message);
        if (error.response && DEBUG_MODE) {
            debugLog("目录列表错误响应:", error.response.data);
        }
        return null;
    }
}

// 获取文件信息，先列目录强制刷新，再获取文件信息
async function getFileInfoWithRefresh(route, filePath, filename) {
    // 先分析出目录路径
    const dirPath = path.dirname(filePath);
    const normalizedDirPath = dirPath === '/' ? '/' : (dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath);
    
    debugLog(`获取文件信息并刷新。目录: ${normalizedDirPath}, 文件名: ${filename}, 线路: ${route.id}`);
    
    // 先列出目录内容，这会强制刷新目录缓存
    const files = await listDirectory(route, normalizedDirPath);
    
    if (!files) {
        debugLog(`线路 ${route.id} 列出目录内容失败`);
        return null;
    }
    
    // 在目录列表中查找文件以确认存在
    const uploadedFile = files.find(f => f.name === filename);
    
    if (!uploadedFile) {
        debugLog(`线路 ${route.id} 在目录列表中未找到文件 ${filename}`);
        return null;
    }
    
    debugLog(`线路 ${route.id} 在目录列表中找到文件:`, uploadedFile);
    
    // 文件存在，等待一下再获取文件信息
    debugLog(`文件已存在，等待 ${RETRY_WAIT_MS}ms 后获取详细文件信息...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_WAIT_MS));
    
    // 获取文件详细信息
    const fileInfo = await getFileInfo(route, filePath);
    if (fileInfo) {
        debugLog(`线路 ${route.id} 成功获取详细文件信息:`, fileInfo);
        return fileInfo;
    } else {
        debugLog(`线路 ${route.id} 获取详细文件信息失败，使用目录列表数据替代`);
        return uploadedFile;  // 使用目录列表中的文件信息作为备选
    }
}

// 构建文件URL，考虑sign参数和绝对路径
function buildFileUrl(route, filePath, fileInfo) {
    debugLog(`线路 ${route.id} 构建文件 URL:`, {filePath, fileInfo});
    
    // 如果有raw_url，优先使用
    //if (fileInfo && fileInfo.raw_url) {
    //    debugLog(`线路 ${route.id} 使用 raw_url: ${fileInfo.raw_url}`);
    //    return fileInfo.raw_url;
    //}
    
    // 构建文件完整路径，包含绝对路径前缀
    const fullPath = route.absolute_path ? `${route.absolute_path}${filePath}` : filePath;
    debugLog(`使用绝对路径前缀: ${route.absolute_path}`);
    debugLog(`完整 URL 路径: ${fullPath}`);
    
    // 构建下载链接
    let fileUrl = `${route.api_url}/d${fullPath}`;
    debugLog(`线路 ${route.id} 使用绝对路径构建的 URL: ${fileUrl}`);
    
    // 如果有签名，添加到URL
    if (fileInfo && fileInfo.sign && fileInfo.sign.trim() !== '') {
        fileUrl += `?sign=${encodeURIComponent(fileInfo.sign)}`;
        debugLog(`线路 ${route.id} 添加签名参数: ${fileUrl}`);
    }
    
    return fileUrl;
}

// 处理上传请求的通用函数
async function handleFileUpload(req, res, route) {
    try {
        debugLog(`线路 ${route.id} 接收到上传请求`);
        
        // 获取文件内容
        const fileContent = req.body;
        if (!fileContent || fileContent.length === 0) {
            debugLog(`线路 ${route.id} 未接收到文件内容`);
            return res.status(400).send('No file content received');
        }
        
        // 生成唯一文件名
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const filename = `upload_${timestamp}_${randomStr}.gif`;
        
        debugLog(`线路 ${route.id} 生成文件名: ${filename}`);
        
        // 获取认证 token
        const token = await getAlistToken(route);
        
        // 准备文件上传路径
        const filePath = `${route.upload_path}${filename}`;
        const encodedFilePath = encodeURIComponent(filePath);
        
        debugLog(`线路 ${route.id} 上传路径: ${filePath}`);
        debugLog(`编码路径: ${encodedFilePath}`);
        debugLog(`文件大小: ${fileContent.length} 字节`);
        
        // 上传文件
        debugLog(`上传到 ${route.api_url}/api/fs/put`);
        
        const uploadResponse = await axios.put(
            `${route.api_url}/api/fs/put`,
            fileContent,
            {
                headers: {
                    'Authorization': token,
                    'File-Path': encodedFilePath,
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': fileContent.length.toString()
                }
            }
        );
        
        debugLog(`线路 ${route.id} 上传响应:`, uploadResponse.data);
        
        if (uploadResponse.data.code === 200) {
            console.log(`线路 ${route.id} 文件上传成功: ${filePath}`);
            
            // 等待指定时间，确保文件系统有时间处理上传文件
            debugLog(`等待 ${INITIAL_WAIT_MS}ms 后验证文件...`);
            await new Promise(resolve => setTimeout(resolve, INITIAL_WAIT_MS));
            
            // 获取文件信息（先列目录强制刷新，再获取文件信息）
            const fileInfo = await getFileInfoWithRefresh(route, filePath, filename);
            
            if (fileInfo) {
                // 构建文件URL，考虑sign参数和绝对路径
                const fileUrl = buildFileUrl(route, filePath, fileInfo);
                console.log(`线路 ${route.id} 文件 URL: ${fileUrl}`);
                
                // 直接返回URL字符串，不包含任何JSON包装
                res.set('Content-Type', 'text/plain');
                res.status(200).send(fileUrl);
            } else {
                // 如果经过列目录和获取文件信息后仍然失败，返回基本URL（带有绝对路径但没有签名）
                console.warn(`线路 ${route.id} 获取文件信息失败 ${filePath}, 返回无签名 URL`);
                const fullPath = route.absolute_path ? `${route.absolute_path}${filePath}` : filePath;
                const basicUrl = `${route.api_url}/d${fullPath}`;
                
                res.set('Content-Type', 'text/plain');
                res.status(200).send(basicUrl);
            }
        } else {
            console.error(`线路 ${route.id} 上传失败:`, uploadResponse.data);
            res.status(500).send('Upload failed');
        }
    } catch (error) {
        console.error(`线路 ${route.id} 处理上传请求错误:`, error);
        if (error.response && DEBUG_MODE) {
            debugLog("错误响应数据:", error.response.data);
        }
        res.status(500).send(`Error: ${error.message}`);
    }
}

// 处理 PUT 请求 - 上传文件到任意线路
app.put('*', async (req, res) => {
    const routeInfo = findRouteByPathSuffix(req.path);
    
    if (!routeInfo) {
        return res.status(404).send('No matching route found');
    }
    
    await handleFileUpload(req, res, routeInfo.route);
});

// 处理 GET 请求 - 返回 image.gif
app.get('*', async (req, res) => {
    try {
        debugLog(`接收到 GET 请求: ${req.path}`);
        
        // 检查是否请求的是特定线路
        const routeInfo = findRouteByPathSuffix(req.path);
        if (!routeInfo) {
            debugLog("未找到匹配的线路");
            return res.status(404).send('Route not found');
        }
        
        debugLog(`使用线路 ${routeInfo.route.id} 处理请求`);
        
        const filePath = path.join(__dirname, 'image.gif');
        debugLog(`提供文件: ${filePath}`);
        
        // 检查文件是否存在
        try {
            await fs.access(filePath);
            debugLog("文件存在，发送到客户端");
        } catch (error) {
            // 文件不存在，创建一个默认的 1x1 透明 GIF
            debugLog("文件不存在，创建透明 GIF");
            const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            await fs.writeFile(filePath, transparentGif);
            debugLog("创建默认透明 GIF 完成");
        }
        
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('发送文件错误:', err);
                res.status(err.status || 500).end();
            } else {
                debugLog("文件发送成功");
            }
        });
    } catch (error) {
        console.error('处理 GET 请求错误:', error);
        res.status(500).send('Internal server error');
    }
});

// 启动服务器
app.listen(SERVER_PORT, () => {
    console.log(`服务器运行在端口 ${SERVER_PORT}`);
    console.log(`已配置 ${ROUTES_CONFIG.length} 条线路`);
    console.log("可用线路:");
    
    ROUTES_CONFIG.forEach(route => {
        const baseUrl = `http://localhost:${SERVER_PORT}${route.suffix ? '/'+route.suffix : ''}`;
        console.log(`- 线路 ${route.id}: ${baseUrl}`);
        console.log(`  API地址: ${route.api_url}`);
        console.log(`  上传路径: ${route.upload_path}`);
        console.log(`  绝对路径: ${route.absolute_path || '(无)'}`);
    });
    
    console.log(`调试模式: ${DEBUG_MODE ? '启用' + (DEBUG_VERBOSE ? ' (详细)' : '') : '禁用'}`);
    console.log(`初始等待: ${INITIAL_WAIT_MS}ms, 重试等待: ${RETRY_WAIT_MS}ms`);
});
