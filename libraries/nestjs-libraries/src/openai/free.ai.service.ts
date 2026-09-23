import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

interface FreeAiProvider {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  timeout: number;
}

export interface FreeAiDraftOptions {
  tone?: string;
  language?: string;
  maxLength?: number;
  notes?: string;
  examples?: string;
  currentText?: string;
}

// IA gratuita para redactar/adaptar texto de publicaciones, sin depender de
// una IA de pago. Primero una API externa compatible con OpenAI (Groq,
// Gemini, OpenRouter...) si hay clave, y si falla o no la hay, Ollama en el
// propio servidor. Mismo contrato que los métodos equivalentes de
// OpenaiService.
@Injectable()
export class FreeAiService {
  private readonly _logger = new Logger(FreeAiService.name);

  private get providers(): FreeAiProvider[] {
    const providers: FreeAiProvider[] = [];
    if (process.env.AI_BASE_URL && process.env.AI_API_KEY) {
      providers.push({
        name: process.env.AI_PROVIDER_NAME || 'externa',
        baseURL: process.env.AI_BASE_URL,
        apiKey: process.env.AI_API_KEY,
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        timeout: 30000,
      });
    }
    if (process.env.OLLAMA_HOST) {
      providers.push({
        name: 'ollama',
        baseURL: `http://${process.env.OLLAMA_HOST}/v1`,
        apiKey: 'ollama',
        model: process.env.OLLAMA_MODEL || 'glm4:9b',
        timeout: 90000,
      });
    }
    return providers;
  }

  isConfigured(): boolean {
    return this.providers.length > 0;
  }

  providerName(): string | null {
    return this.providers[0]?.name || null;
  }

  private async chat(system: string, prompt: string): Promise<string> {
    const providers = this.providers;
    if (!providers.length) {
      throw new Error('No hay ninguna IA configurada (AI_BASE_URL u OLLAMA_HOST)');
    }

    let lastError: any;
    for (const provider of providers) {
      try {
        const client = new OpenAI({
          baseURL: provider.baseURL,
          apiKey: provider.apiKey,
          timeout: provider.timeout,
          maxRetries: 0,
        });
        const response = await client.chat.completions.create({
          model: provider.model,
          temperature: 0.7,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        });
        const content = response.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new Error('respuesta vacía');
        }
        return content;
      } catch (err: any) {
        lastError = err;
        this._logger.warn(
          `IA "${provider.name}" ha fallado: ${err?.message || err}`
        );
      }
    }
    throw new Error(lastError?.message || 'La IA ha fallado');
  }

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
    options: FreeAiDraftOptions = {}
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
      options.notes ? `Context about the account:\n${options.notes}` : '',
      options.examples
        ? `Real posts by the author that worked well. Copy their voice, hook style and structure, not their content:\n${options.examples}`
        : '',
      // Al final a propósito: los modelos respetan más lo último del prompt
      `STRICT RULES (most important):
- Never invent facts. No numbers, percentages, salaries or statistics that are not in the instruction or the current draft.
- Never invent first-person events or quantities about the author's work: any sentence where the author says something happened to them (me presentaron, entrevisté, estuve en, he visto, rechacé, contraté, en una auditoría, reviso cientos de CV, cada semana...) must be a placeholder unless the instruction or the current draft gives it.
- Also never invent talks, awards, employers, clients or events.
- Placeholders go in square brackets for the author to fill, e.g. [DATO: sueldo medio de un junior] or [TU EXPERIENCIA: un candidato con muchos títulos que falló en lo práctico]. The hook can be a placeholder too.
- Opinions and advice in first person are fine (creo, prefiero, lo que yo miraría).
- The examples show structure and voice only. Never copy their labels literally; write a natural sentence instead.`,
    ]
      .filter((f) => !!f)
      .join('\n\n');

    const prompt = options.currentText
      ? `Current draft:\n${options.currentText}\n\nRewrite the draft following this instruction: ${instruction}\nKeep any [placeholder] from the draft unless the instruction fills it.`
      : instruction;

    return this.chat(system, prompt);
  }
}
