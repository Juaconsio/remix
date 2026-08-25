import type { RoscoPack } from '../types/rosco';
import { roscoPacks } from '../data/rosco';

export interface RoscoRepository {
  getPacks(): RoscoPack[];
  getPack(packId: string): RoscoPack | null;
}

export class LocalRoscoRepository implements RoscoRepository {
  getPacks(): RoscoPack[] {
    return roscoPacks;
  }

  getPack(packId: string): RoscoPack | null {
    return roscoPacks.find((p) => p.id === packId) ?? null;
  }
}

export const roscoRepository = new LocalRoscoRepository();
