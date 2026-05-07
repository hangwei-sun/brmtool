import { CoolCommException } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import * as moment from 'moment';
import { Repository } from 'typeorm';
import { AiConversationEntity } from '../entity/conversation';
import { AiGenerationEntity } from '../entity/generation';
import { AiMessageEntity } from '../entity/message';
import { AiModelEntity } from '../entity/model';
import { AiTemplateEntity } from '../entity/template';

interface AiSendBody {
  conversationId?: number;
  content: string;
  modelId?: string;
  thinking?: boolean | number;
  mode?: string;
  templateId?: number;
}

interface AiQuery {
  page?: number;
  size?: number;
}

interface AiGenerateBody {
  conversationId?: number;
  type: 'image' | 'audio_music' | 'audio_speech' | 'video';
  prompt: string;
  modelId?: string;
  size?: string;
  duration?: number;
  voice?: string;
}

const DEFAULT_MODELS = [
  {
    provider: 'deepseek',
    capability: 'text',
    modelId: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    description: '复杂推理、Agent 与高质量创作优先',
    isDefault: 1,
    thinkingDefault: 1,
    sort: 100,
    status: 1,
  },
  {
    provider: 'deepseek',
    capability: 'text',
    modelId: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    description: '快速响应、轻量问答与日常写作优先',
    isDefault: 0,
    thinkingDefault: 0,
    sort: 90,
    status: 1,
  },
  {
    provider: 'volcengine',
    capability: 'image',
    modelId: 'doubao-seedream-5-0-260128',
    legacyModelId: 'seedream-5-0-lite',
    name: 'Doubao-Seedream-5.0-lite',
    description: '火山引擎图片生成，模型 ID 按控制台示例/接入点配置',
    apiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiPath: '/images/generations',
    isDefault: 1,
    thinkingDefault: 0,
    sort: 80,
    status: 1,
  },
  {
    provider: 'volcengine',
    capability: 'audio_music',
    modelId: 'volcengine-music-generation',
    name: '火山引擎音乐生成',
    description: '音乐生成接口，默认路径可在后台替换为实际火山 endpoint',
    apiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiPath: '/audio/generations',
    isDefault: 1,
    thinkingDefault: 0,
    sort: 70,
    status: 1,
  },
  {
    provider: 'volcengine',
    capability: 'audio_speech',
    modelId: 'volcengine-chattts',
    name: '火山引擎 ChatTTS 语音',
    description: '语音合成接口，默认路径可在后台替换为实际火山 endpoint',
    apiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiPath: '/audio/speech',
    isDefault: 1,
    thinkingDefault: 0,
    sort: 60,
    status: 1,
  },
  {
    provider: 'volcengine',
    capability: 'video',
    modelId: 'seedance-2-0',
    name: '字节 Seedance 2.0',
    description: '火山引擎视频生成任务接口，支持任务 ID 返回和后续查询',
    apiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiPath: '/contents/generations/tasks',
    apiTaskPath: '/contents/generations/tasks/{taskId}',
    isDefault: 1,
    thinkingDefault: 0,
    sort: 50,
    status: 1,
  },
];

const DEFAULT_TEMPLATES = [
  {
    title: '创作者成长计划',
    category: 'discover',
    description: '从创意到变现，系统提升创作能力',
    prompt:
      '你是一名资深创作教练。请根据用户的目标，输出一个可执行的创作者成长计划，包含阶段目标、每日动作、复盘指标和风险提醒。',
    tags: ['精选', '成长'],
    sort: 100,
    status: 1,
  },
  {
    title: '国风纹样生成',
    category: 'discover',
    description: '生成适合国风图案创作的提示词',
    prompt:
      '你是一名视觉提示词专家。请把用户的想法改写成国风纹样生成提示词，包含主体、纹样元素、色彩、材质、构图和负面提示。',
    tags: ['AI 生成', '提示词'],
    sort: 90,
    status: 1,
  },
  {
    title: '城市建筑灵感',
    category: 'discover',
    description: '获取建筑设计灵感与概念说明',
    prompt:
      '你是一名城市建筑概念设计顾问。请根据用户输入生成建筑灵感方案，包括设计主题、空间叙事、材料建议和落地注意事项。',
    tags: ['建筑', '灵感'],
    sort: 80,
    status: 1,
  },
  {
    title: '角色设定草图',
    category: 'discover',
    description: '快速生成角色设定与多视图草稿说明',
    prompt:
      '你是一名角色设定编剧。请根据用户描述生成角色设定，包含身份背景、性格弧光、外观关键词、服饰细节和画师提示词。',
    tags: ['角色设定', '写作'],
    sort: 70,
    status: 1,
  },
];

@Provide()
export class AiAppService {
  @InjectEntityModel(AiModelEntity)
  modelRepo: Repository<AiModelEntity>;

  @InjectEntityModel(AiTemplateEntity)
  templateRepo: Repository<AiTemplateEntity>;

  @InjectEntityModel(AiConversationEntity)
  conversationRepo: Repository<AiConversationEntity>;

  @InjectEntityModel(AiMessageEntity)
  messageRepo: Repository<AiMessageEntity>;

  @InjectEntityModel(AiGenerationEntity)
  generationRepo: Repository<AiGenerationEntity>;

  async models() {
    await this.ensureDefaults();
    const list = await this.modelRepo.find({
      where: { status: 1 },
      order: { sort: 'DESC', createTime: 'ASC' },
    });
    return { list: list.map(e => this.publicModel(e)) };
  }

  async templates() {
    await this.ensureDefaults();
    const list = await this.templateRepo.find({
      where: { status: 1 },
      order: { sort: 'DESC', createTime: 'DESC' },
    });
    return { list };
  }

  async conversations(userId: number, query: AiQuery = {}) {
    const page = this.clampPositiveInteger(query.page, 1, 1, 10000);
    const size = this.clampPositiveInteger(query.size, 30, 1, 100);
    const [list, total] = await this.conversationRepo.findAndCount({
      where: { userId, status: 1 },
      order: { updateTime: 'DESC', createTime: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size };
  }

  async conversationInfo(userId: number, id: number) {
    const conversation = await this.getConversation(userId, id);
    const messages = await this.messageRepo.find({
      where: { userId, conversationId: conversation.id },
      order: { createTime: 'ASC', id: 'ASC' },
      take: 200,
    });
    return { conversation, messages };
  }

  async createConversation(userId: number, body: Partial<AiSendBody> = {}) {
    const model = await this.resolveModel(body.modelId);
    const title = this.normalizeTitle(body.content || '新的智能会话');
    const conversation = await this.conversationRepo.save({
      userId,
      title,
      modelId: model.modelId,
      thinking: this.resolveThinking(body.thinking, model),
      mode: this.normalizeMode(body.mode),
      status: 1,
      lastMessage: '',
      lastMessageTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
    return conversation;
  }

  private async createGenerationConversation(
    userId: number,
    body: { type: AiGenerateBody['type']; prompt: string; modelId: string }
  ) {
    return await this.conversationRepo.save({
      userId,
      title: this.normalizeTitle(body.prompt),
      modelId: body.modelId,
      thinking: 0,
      mode: body.type,
      status: 1,
      lastMessage: '',
      lastMessageTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  async deleteConversation(userId: number, id: number) {
    const conversation = await this.getConversation(userId, id);
    await this.conversationRepo.update({ id: conversation.id }, { status: 0 });
    return { deleted: true };
  }

  async send(userId: number, body: AiSendBody) {
    const runtime = await this.prepareRuntime(userId, body);
    await this.saveUserMessage(runtime.conversation, runtime.content);

    try {
      const response = await this.callDeepSeek({
        modelId: runtime.model.modelId,
        apiKey: runtime.model.apiKey,
        messages: runtime.messages,
        thinking: runtime.thinking,
        stream: false,
        userId,
      });
      const message = response.choices?.[0]?.message || {};
      const content = String(message.content || '');
      const reasoningContent = String(message.reasoning_content || '');
      const saved = await this.saveAssistantMessage(
        runtime.conversation,
        content,
        reasoningContent,
        runtime.model.modelId,
        response.usage
      );
      await this.touchConversation(runtime.conversation, content);
      return {
        conversation: runtime.conversation,
        message: saved,
      };
    } catch (err) {
      await this.saveAssistantError(
        runtime.conversation,
        runtime.model.modelId,
        (err as Error).message
      );
      throw err;
    }
  }

  async stream(userId: number, body: AiSendBody, ctx: any) {
    ctx.respond = false;
    const res = ctx.res;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    let runtime: Awaited<ReturnType<typeof this.prepareRuntime>> | null = null;
    let content = '';
    let reasoningContent = '';
    let usage: Record<string, any> | null = null;

    const write = (data: Record<string, any>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      runtime = await this.prepareRuntime(userId, body);
      await this.saveUserMessage(runtime.conversation, runtime.content);
      write({ type: 'meta', conversation: runtime.conversation });

      const response = await this.callDeepSeekResponse({
        modelId: runtime.model.modelId,
        apiKey: runtime.model.apiKey,
        messages: runtime.messages,
        thinking: runtime.thinking,
        stream: true,
        userId,
      });

      await this.readDeepSeekStream(response, chunk => {
        if (chunk.usage) {
          usage = chunk.usage;
        }
        const delta = chunk.choices?.[0]?.delta || {};
        const text = String(delta.content || '');
        const reasoning = String(delta.reasoning_content || '');
        if (text) {
          content += text;
          write({ type: 'delta', content: text });
        }
        if (reasoning) {
          reasoningContent += reasoning;
          write({ type: 'reasoning', content: reasoning });
        }
      });

      const saved = await this.saveAssistantMessage(
        runtime.conversation,
        content,
        reasoningContent,
        runtime.model.modelId,
        usage
      );
      await this.touchConversation(runtime.conversation, content);
      write({ type: 'done', message: saved });
    } catch (err) {
      if (runtime) {
        await this.saveAssistantError(
          runtime.conversation,
          runtime.model.modelId,
          (err as Error).message
        );
      }
      write({ type: 'error', error: (err as Error).message });
    } finally {
      res.end();
    }
  }

  async generate(userId: number, body: AiGenerateBody) {
    const type = this.normalizeGenerationType(body.type);
    const prompt = this.normalizeContent(body.prompt);
    const model = await this.resolveGenerationModel(type, body.modelId);
    const conversation = body.conversationId
      ? await this.getConversation(userId, Number(body.conversationId))
      : await this.createGenerationConversation(userId, {
          type,
          prompt,
          modelId: model.modelId,
        });
    await this.saveUserMessage(conversation, prompt);

    try {
      const response = await this.callVolcengineGeneration(model, {
        ...body,
        type,
        prompt,
      });
      const taskId = this.pickTaskId(response);
      const outputUrls = this.extractUrls(response);
      const generation = await this.generationRepo.save({
        userId,
        type,
        provider: model.provider,
        modelId: model.modelId,
        prompt,
        status: taskId && outputUrls.length === 0 ? 'processing' : 'succeeded',
        taskId,
        outputUrls,
        response,
      });
      const content = this.generationMessage(generation);
      const message = await this.saveAssistantMessage(
        conversation,
        content,
        '',
        model.modelId,
        { generationId: generation.id, type: generation.type }
      );
      await this.touchConversation(conversation, content);
      return { generation, conversation, message };
    } catch (err) {
      const generation = await this.generationRepo.save({
        userId,
        type,
        provider: model.provider,
        modelId: model.modelId,
        prompt,
        status: 'failed',
        outputUrls: [],
        errorMessage: this.safeError((err as Error).message),
      });
      await this.saveAssistantError(
        conversation,
        model.modelId,
        generation.errorMessage
      );
      throw new CoolCommException(generation.errorMessage);
    }
  }

  async generations(userId: number, query: AiQuery = {}) {
    const page = this.clampPositiveInteger(query.page, 1, 1, 10000);
    const size = this.clampPositiveInteger(query.size, 30, 1, 100);
    const [list, total] = await this.generationRepo.findAndCount({
      where: { userId },
      order: { createTime: 'DESC', id: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size };
  }

  async generationInfo(userId: number, id: number) {
    const generation = await this.getGeneration(userId, id);
    return { generation };
  }

  async syncGeneration(userId: number, id: number) {
    const generation = await this.getGeneration(userId, id);
    if (!generation.taskId || generation.status !== 'processing') {
      return { generation };
    }

    const model = await this.resolveGenerationModel(
      generation.type as AiGenerateBody['type'],
      generation.modelId
    );
    if (!model.apiTaskPath) {
      return { generation };
    }

    const response = await this.callVolcengineTask(model, generation.taskId);
    const outputUrls = this.extractUrls(response);
    const status = this.resolveGenerationStatus(response, outputUrls);
    await this.generationRepo.update(
      { id: generation.id },
      { status, outputUrls, response }
    );
    return await this.generationInfo(userId, generation.id);
  }

  private async prepareRuntime(userId: number, body: AiSendBody) {
    const content = this.normalizeContent(body.content);
    await this.ensureDefaults();
    const model = await this.resolveModel(body.modelId);
    const thinking = this.resolveThinking(body.thinking, model);
    const conversation = body.conversationId
      ? await this.getConversation(userId, Number(body.conversationId))
      : await this.createConversation(userId, {
          ...body,
          content,
          modelId: model.modelId,
          thinking,
        });
    const systemPrompt = await this.systemPrompt(body.mode, body.templateId);
    const history = await this.historyMessages(userId, conversation.id);

    return {
      content,
      model,
      thinking,
      conversation,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content },
      ],
    };
  }

  private async callDeepSeek(payload: {
    modelId: string;
    apiKey?: string;
    messages: any[];
    thinking: number;
    stream: boolean;
    userId: number;
  }) {
    const response = await this.callDeepSeekResponse(payload);
    return await response.json();
  }

  private async callDeepSeekResponse(payload: {
    modelId: string;
    apiKey?: string;
    messages: any[];
    thinking: number;
    stream: boolean;
    userId: number;
  }) {
    const key = payload.apiKey || process.env.BRMTOOL_DEEPSEEK_API_KEY;
    if (!key) {
      throw new CoolCommException('DeepSeek API Key 未配置');
    }

    const baseUrl =
      process.env.BRMTOOL_DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: payload.modelId,
          messages: payload.messages,
          thinking: { type: payload.thinking ? 'enabled' : 'disabled' },
          reasoning_effort: 'high',
          max_tokens: 4096,
          stream: payload.stream,
          stream_options: payload.stream ? { include_usage: true } : undefined,
          user_id: `brmtool-${payload.userId}`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new CoolCommException(
        error?.error?.message ||
          error?.message ||
          `DeepSeek 请求失败：${response.status}`
      );
    }

    return response;
  }

  private async readDeepSeekStream(
    response: Response,
    onChunk: (chunk: any) => void
  ) {
    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const text = line.trim();
        if (!text.startsWith('data:')) {
          continue;
        }
        const data = text.replace(/^data:\s*/, '');
        if (data === '[DONE]') {
          return;
        }
        try {
          onChunk(JSON.parse(data));
        } catch {}
      }
    }
  }

  private async callVolcengineGeneration(
    model: AiModelEntity,
    body: AiGenerateBody
  ) {
    const response = await this.callVolcengine(model, model.apiPath, {
      method: 'POST',
      body: this.volcengineBody(model, body),
    });
    return await response.json();
  }

  private async callVolcengineTask(model: AiModelEntity, taskId: string) {
    const path = String(model.apiTaskPath || '').replace('{taskId}', taskId);
    const response = await this.callVolcengine(model, path, { method: 'GET' });
    return await response.json();
  }

  private async callVolcengine(
    model: AiModelEntity,
    path: string | undefined,
    options: { method: 'GET' | 'POST'; body?: Record<string, any> }
  ) {
    const key =
      model.apiKey ||
      process.env.BRMTOOL_VOLCENGINE_API_KEY ||
      process.env.ARK_API_KEY;
    if (!key) {
      throw new CoolCommException('火山引擎 API Key 未配置');
    }

    const baseUrl =
      model.apiBaseUrl ||
      process.env.BRMTOOL_VOLCENGINE_ARK_BASE_URL ||
      'https://ark.cn-beijing.volces.com/api/v3';
    const url = `${baseUrl.replace(/\/$/, '')}${this.normalizePath(path)}`;
    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new CoolCommException(
        this.volcengineErrorMessage(
          error?.error?.message ||
            error?.message ||
            `火山引擎请求失败：${response.status}`,
          model
        )
      );
    }
    return response;
  }

  private volcengineErrorMessage(message: string, model: AiModelEntity) {
    const text = String(message || '');
    if (/parameter.*size|image size/i.test(text)) {
      return '火山引擎图片尺寸不合法：Seedream 5.0 Lite 要求图片尺寸至少 3686400 像素。默认已按 1080P 档使用 1920x1920；如仍报错，请检查后台或请求中的 size 参数。';
    }
    if (
      /model or endpoint/i.test(text) &&
      /does not exist|do not have access/i.test(text)
    ) {
      return `火山引擎模型不可用：当前模型 ID「${model.modelId}」不是你账号下可访问的模型或推理接入点。请到后台 AI 模型管理，将“模型 ID”改为火山控制台示例中的模型 ID 或你创建的 endpoint ID，并确认权限已开通。`;
    }
    return text;
  }

  private volcengineBody(model: AiModelEntity, body: AiGenerateBody) {
    if (body.type === 'image') {
      return {
        model: model.modelId,
        prompt: body.prompt,
        response_format: 'url',
        size: body.size || '1920x1920',
        sequential_image_generation: 'disabled',
        stream: false,
        watermark: true,
      };
    }

    if (body.type === 'video') {
      return {
        model: model.modelId,
        content: [{ type: 'text', text: body.prompt }],
        prompt: body.prompt,
        duration: body.duration || 5,
      };
    }

    if (body.type === 'audio_speech') {
      return {
        model: model.modelId,
        input: body.prompt,
        voice: body.voice || 'zh_female',
        response_format: 'url',
      };
    }

    return {
      model: model.modelId,
      prompt: body.prompt,
      duration: body.duration || 30,
      response_format: 'url',
    };
  }

  private async ensureDefaults() {
    for (const item of DEFAULT_MODELS) {
      const { legacyModelId, ...modelData } = item;
      const exists = await this.modelRepo.findOne({
        where: { modelId: modelData.modelId },
      });
      if (exists) {
        continue;
      }

      const legacy = legacyModelId
        ? await this.modelRepo.findOne({
            where: { modelId: legacyModelId },
          })
        : null;
      if (legacy) {
        await this.modelRepo.update({ id: legacy.id }, modelData);
      } else {
        await this.modelRepo.save(modelData);
      }
    }

    const templateCount = await this.templateRepo.count();
    if (templateCount === 0) {
      await this.templateRepo.save(DEFAULT_TEMPLATES);
    }
  }

  private async resolveModel(modelId?: string) {
    await this.ensureDefaults();
    let model: AiModelEntity | null = null;

    if (modelId) {
      model = await this.modelQuery()
        .where('model.provider = :provider', { provider: 'deepseek' })
        .andWhere('model.capability = :capability', { capability: 'text' })
        .andWhere('model.modelId = :modelId', { modelId })
        .andWhere('model.status = :status', { status: 1 })
        .getOne();
    }

    if (!model) {
      model = await this.modelQuery()
        .where('model.provider = :provider', { provider: 'deepseek' })
        .andWhere('model.capability = :capability', { capability: 'text' })
        .andWhere('model.isDefault = :isDefault', { isDefault: 1 })
        .andWhere('model.status = :status', { status: 1 })
        .orderBy('model.sort', 'DESC')
        .getOne();
    }

    if (!model) {
      model = await this.modelQuery()
        .where('model.provider = :provider', { provider: 'deepseek' })
        .andWhere('model.capability = :capability', { capability: 'text' })
        .andWhere('model.modelId = :modelId', {
          modelId: 'deepseek-v4-pro',
        })
        .andWhere('model.status = :status', { status: 1 })
        .getOne();
    }

    if (!model) {
      throw new CoolCommException('可用 AI 模型未配置');
    }

    return model;
  }

  private async resolveGenerationModel(
    type: AiGenerateBody['type'],
    modelId?: string
  ) {
    await this.ensureDefaults();
    let model: AiModelEntity | null = null;

    if (modelId) {
      model = await this.modelQuery()
        .where('model.capability = :capability', { capability: type })
        .andWhere('model.modelId = :modelId', { modelId })
        .andWhere('model.status = :status', { status: 1 })
        .getOne();
    }

    if (!model) {
      model = await this.modelQuery()
        .where('model.provider = :provider', { provider: 'volcengine' })
        .andWhere('model.capability = :capability', { capability: type })
        .andWhere('model.isDefault = :isDefault', { isDefault: 1 })
        .andWhere('model.status = :status', { status: 1 })
        .orderBy('model.sort', 'DESC')
        .getOne();
    }

    if (!model) {
      model = await this.modelQuery()
        .where('model.capability = :capability', { capability: type })
        .andWhere('model.status = :status', { status: 1 })
        .orderBy('model.sort', 'DESC')
        .getOne();
    }

    if (!model) {
      throw new CoolCommException('可用多模态模型未配置');
    }
    return model;
  }

  private modelQuery() {
    return this.modelRepo.createQueryBuilder('model').addSelect('model.apiKey');
  }

  private async getGeneration(userId: number, id: number) {
    const generation = await this.generationRepo.findOneBy({
      id: Number(id),
      userId,
    });
    if (!generation) {
      throw new CoolCommException('生成记录不存在或无权访问');
    }
    return generation;
  }

  private async getConversation(userId: number, id: number) {
    const conversation = await this.conversationRepo.findOneBy({
      id: Number(id),
      userId,
      status: 1,
    });
    if (!conversation) {
      throw new CoolCommException('会话不存在或无权访问');
    }
    return conversation;
  }

  private async historyMessages(userId: number, conversationId: number) {
    const list = await this.messageRepo.find({
      where: { userId, conversationId, status: 1 },
      order: { createTime: 'DESC', id: 'DESC' },
      take: 20,
    });
    return list
      .reverse()
      .filter(e => e.role === 'user' || e.role === 'assistant')
      .map(e => ({ role: e.role, content: e.content || '' }));
  }

  private async systemPrompt(mode?: string, templateId?: number) {
    if (templateId) {
      const template = await this.templateRepo.findOneBy({
        id: Number(templateId),
        status: 1,
      });
      if (template) {
        await this.templateRepo.increment({ id: template.id }, 'useCount', 1);
        return template.prompt;
      }
    }

    if (this.normalizeMode(mode) === 'writing') {
      return '你是数智工具箱的写作助手，擅长中文改写、提纲、标题、脚本和工作材料。输出要清晰、可执行、避免空话。';
    }

    return '你是数智工具箱的 Agent 助手，帮助用户拆解任务、生成方案、编写内容和整理工作流。回答保持简洁、结构化、可落地。';
  }

  private async saveUserMessage(
    conversation: AiConversationEntity,
    content: string
  ) {
    await this.messageRepo.save({
      conversationId: conversation.id,
      userId: conversation.userId,
      role: 'user',
      content,
      status: 1,
    });
    await this.touchConversation(conversation, content);
  }

  private async saveAssistantMessage(
    conversation: AiConversationEntity,
    content: string,
    reasoningContent: string,
    modelId: string,
    usage: Record<string, any> | null
  ) {
    return await this.messageRepo.save({
      conversationId: conversation.id,
      userId: conversation.userId,
      role: 'assistant',
      content,
      reasoningContent,
      modelId,
      usage,
      status: 1,
    });
  }

  private async saveAssistantError(
    conversation: AiConversationEntity,
    modelId: string,
    errorMessage: string
  ) {
    return await this.messageRepo.save({
      conversationId: conversation.id,
      userId: conversation.userId,
      role: 'assistant',
      content: '',
      modelId,
      status: 2,
      errorMessage: this.safeError(errorMessage),
    });
  }

  private async touchConversation(
    conversation: AiConversationEntity,
    lastMessage: string
  ) {
    await this.conversationRepo.update(
      { id: conversation.id },
      {
        title: conversation.title || this.normalizeTitle(lastMessage),
        lastMessage: this.truncate(lastMessage, 240),
        lastMessageTime: moment().format('YYYY-MM-DD HH:mm:ss'),
      }
    );
  }

  private normalizeContent(content: string) {
    const value = String(content || '').trim();
    if (!value) {
      throw new CoolCommException('请输入内容');
    }
    if (value.length > 8000) {
      throw new CoolCommException('单次输入不能超过 8000 字');
    }
    return value;
  }

  private normalizeTitle(content: string) {
    return this.truncate(String(content || '新的智能会话').trim(), 40);
  }

  private normalizeMode(mode?: string) {
    return mode === 'writing' ? 'writing' : 'agent';
  }

  private normalizeGenerationType(type: string) {
    const allow = ['image', 'audio_music', 'audio_speech', 'video'];
    if (!allow.includes(type)) {
      throw new CoolCommException('生成类型不支持');
    }
    return type as AiGenerateBody['type'];
  }

  private generationMessage(generation: AiGenerationEntity) {
    const label = this.generationLabel(generation.type);
    if (generation.status === 'processing') {
      return `${label}任务已提交，任务 ID：${
        generation.taskId || generation.id
      }\n可稍后刷新生成记录查看结果。`;
    }
    if (generation.outputUrls?.length) {
      return `${label}生成完成：\n${generation.outputUrls.join('\n')}`;
    }
    return `${label}生成完成，但响应中未解析到资源地址，请在后台检查原始响应。`;
  }

  private generationLabel(type: string) {
    const labels = {
      image: '图片',
      audio_music: '音乐',
      audio_speech: '语音',
      video: '视频',
    };
    return labels[type] || '内容';
  }

  private normalizePath(path?: string) {
    const value = String(path || '').trim();
    if (!value) {
      throw new CoolCommException('模型生成接口路径未配置');
    }
    return value.startsWith('/') ? value : `/${value}`;
  }

  private pickTaskId(response: any) {
    return String(
      response?.id ||
        response?.task_id ||
        response?.taskId ||
        response?.data?.id ||
        response?.data?.task_id ||
        ''
    );
  }

  private resolveGenerationStatus(response: any, outputUrls: string[]) {
    const raw = String(
      response?.status || response?.data?.status || response?.task_status || ''
    ).toLowerCase();
    if (['failed', 'error', 'cancelled', 'canceled'].includes(raw)) {
      return 'failed';
    }
    if (
      outputUrls.length > 0 ||
      ['succeeded', 'success', 'completed', 'done'].includes(raw)
    ) {
      return 'succeeded';
    }
    return 'processing';
  }

  private extractUrls(value: any) {
    const urls = new Set<string>();
    const visit = (item: any) => {
      if (typeof item === 'string') {
        if (
          /^https?:\/\//i.test(item) ||
          /^data:(image|audio|video)\//i.test(item)
        ) {
          urls.add(item);
        }
        return;
      }
      if (Array.isArray(item)) {
        item.forEach(visit);
        return;
      }
      if (item && typeof item === 'object') {
        Object.values(item).forEach(visit);
      }
    };
    visit(value);
    return [...urls];
  }

  private resolveThinking(
    value: boolean | number | undefined,
    model: AiModelEntity
  ) {
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (value === 0 || value === 1) {
      return Number(value);
    }
    return Number(model.thinkingDefault || 0);
  }

  private publicModel(model: AiModelEntity) {
    const {
      id,
      provider,
      capability,
      modelId,
      name,
      description,
      apiKeyConfigured,
      isDefault,
      thinkingDefault,
      sort,
    } = model;
    return {
      id,
      provider,
      capability,
      modelId,
      name,
      description,
      apiKeyConfigured,
      isDefault,
      thinkingDefault,
      sort,
    };
  }

  private safeError(message: string) {
    return String(message || 'AI 请求失败')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer ***')
      .replace(process.env.BRMTOOL_DEEPSEEK_API_KEY || '__NO_KEY__', '***')
      .replace(process.env.BRMTOOL_VOLCENGINE_API_KEY || '__NO_KEY__', '***')
      .replace(process.env.ARK_API_KEY || '__NO_KEY__', '***');
  }

  private truncate(value: string, length: number) {
    return value.length > length ? `${value.slice(0, length - 1)}…` : value;
  }

  private clampPositiveInteger(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number
  ) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(parsed, min), max);
  }
}
