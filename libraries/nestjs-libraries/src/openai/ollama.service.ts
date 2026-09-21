import { Injectable } from '@nestjs/common';

// IA local y gratuita (Ollama) para redactar/adaptar texto de publicaciones,
// sin depender de una IA de pago. Mismo contrato que los métodos equivalentes
// de OpenaiService para poder usarse como alternativa/fallback.
@Injectable()
export class OllamaService {
  isConfigured(): boolean {
    return !!process.env.OLLAMA_HOST;
  }

  private get model() {
    return process.env.OLLAMA_MODEL || 'glm4:9b';
  }

  private async chat(
    system: string,
    prompt: string,
    timeoutMs = 60000
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OLLAMA_HOST no está configurado');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        `http://${process.env.OLLAMA_HOST}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.model,
            stream: false,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: prompt },
            ],
            options: { temperature: 0.7 },
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`Ollama respondió ${response.status}`);
      }
      const data = (await response.json()) as {
        message?: { content?: string };
      };
      const content = data?.message?.content?.trim();
      if (!content) {
        throw new Error('Ollama devolvió una respuesta vacía');
      }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Mismo contrato que OpenaiService.adaptPostForProvider, para usarse como
  // alternativa gratuita en AdaptService.
  async adaptPostForProvider(
    content: string,
    options: {
      identifier: string;
      maxLength: number;
      tone?: string;
      language?: string;
      hashtags?: string[];
    }
  ): Promise<string> {
    const system = [
      `You adapt social media posts for the "${options.identifier}" network.`,
      `Keep the original meaning and facts, do not invent information.`,
      `Reply with the adapted post text only: no preamble, no explanation, no quotes around it.`,
      `Plain text only: paragraphs separated by a blank line, no markdown, no HTML.`,
      `The final text must be at most ${options.maxLength} characters including hashtags.`,
      options.tone ? `Use this tone: ${options.tone}.` : '',
      options.language
        ? `Write in this language: ${options.language}.`
        : 'Keep the language of the original text.',
      options.hashtags?.length
        ? `If they fit, end with these hashtags on their own line: ${options.hashtags.join(
            ' '
          )}.`
        : '',
    ]
      .filter((f) => !!f)
      .join('\n');

    return this.chat(system, content);
  }

  // Redacta un borrador desde una instrucción o tema (creador de post).
  async draftPost(
    instruction: string,
    options: {
      tone?: string;
      language?: string;
      maxLength?: number;
    } = {}
  ): Promise<string> {
    const system = [
      `You write social media post drafts from the user's instruction or topic.`,
      `Reply with the post text only: no preamble, no explanation, no quotes around it.`,
      `Plain text only: paragraphs separated by a blank line, no markdown, no HTML, no hashtags unless asked.`,
      options.maxLength
        ? `Keep it under ${options.maxLength} characters.`
        : '',
      options.tone ? `Use this tone: ${options.tone}.` : '',
      options.language ? `Write in this language: ${options.language}.` : '',
    ]
      .filter((f) => !!f)
      .join('\n');

    return this.chat(system, instruction);
  }
}
