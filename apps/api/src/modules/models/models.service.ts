import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

import { ModelDto, ModelsResponseDto } from '../../dto/model.dto';

// --- Interfaces privées pour typer les réponses MLflow ---
interface MlflowExperiment {
    experiment_id: string;
    name: string;
    artifact_location: string;
    lifecycle_stage: string;
}

interface MlflowRun {
    info: {
        run_id: string;
        run_name: string;
        experiment_id: string;
        status: string;
        start_time: number;
        artifact_uri: string;
    };
    data: {
        metrics: Record<string, number>;
        params: Record<string, string>;
        tags: Record<string, string>;
    };
}

@Injectable()
export class ModelsService {
    private readonly logger = new Logger(ModelsService.name);

    // Utilisation de process.env pour la flexibilité (Docker vs Local)
    // Par défaut Docker: http://mlflow:5000, Local: http://localhost:5000
    private get mlflowUrl(): string {
        return process.env.MLFLOW_TRACKING_URI || 'http://mlflow:5000';
    }

    // Le nom de l'expérience doit correspondre exactement à celui dans training.py
    private get experimentName(): string {
        return process.env.MLFLOW_EXPERIMENT_NAME || 'Default';
    }

    async getModels(): Promise<ModelsResponseDto> {
        try {
            const experimentNames = [this.experimentName, 'Seeding'];
            this.logger.log(`Fetching models from ${this.mlflowUrl} for experiments: ${experimentNames.join(', ')}`);

            const experimentIds: string[] = [];

            // 1. Get Experiment IDs
            for (const name of experimentNames) {
                try {
                    const expUrl = `${this.mlflowUrl}/api/2.0/mlflow/experiments/get-by-name?experiment_name=${encodeURIComponent(name)}`;
                    const expResponse = await fetch(expUrl);

                    if (expResponse.ok) {
                        const expData = await expResponse.json();
                        if (expData.experiment && expData.experiment.experiment_id) {
                            experimentIds.push(expData.experiment.experiment_id);
                        }
                    } else if (expResponse.status !== 404) {
                        this.logger.warn(`Failed to fetch experiment "${name}": ${expResponse.statusText}`);
                    }
                } catch (err) {
                    this.logger.warn(`Error fetching experiment "${name}": ${err}`);
                }
            }

            if (experimentIds.length === 0) {
                this.logger.warn(`No experiments found for names: ${experimentNames.join(', ')}`);
                return { models: [], bestModel: null };
            }

            // 2. Search Runs (Finished runs only, sorted by val_loss)
            const searchResponse = await fetch(`${this.mlflowUrl}/api/2.0/mlflow/runs/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    experiment_ids: experimentIds,
                    max_results: 50,
                    order_by: ["metrics.val_loss ASC"], // Le meilleur modèle (perte la plus faible) en premier
                    filter: "status = 'FINISHED'"
                }),
            });

            if (!searchResponse.ok) {
                throw new Error(`MLflow search error: ${searchResponse.statusText}`);
            }

            const searchData = await searchResponse.json();
            const runs: MlflowRun[] = searchData.runs || [];

            // 3. Format models to DTO
            const models: ModelDto[] = runs.map((run) => {
                const metrics = run.data.metrics || {};
                const params = run.data.params || {};
                const runId = run.info.run_id;
                const runName = run.info.run_name || runId;
                const valLoss = metrics.val_loss !== undefined ? metrics.val_loss.toFixed(4) : 'N/A';

                return {
                    id: runId,
                    name: `${runName} (Loss: ${valLoss})`,
                    metrics: metrics,
                    params: params,
                    // On suppose que l'artefact s'appelle "model" (standard MLflow standard)
                    uri: `runs:/${runId}/model`,
                    createdAt: run.info.start_time
                };
            });

            // Comme on a trié par val_loss ASC, le premier est le meilleur
            const bestModel = models.length > 0 ? models[0] : null;

            return {
                models,
                bestModel
            };

        } catch (error) {
            this.logger.error('Error fetching models from MLflow', error);
            // On retourne une erreur 500 propre au contrôleur
            throw new InternalServerErrorException('Failed to fetch models from MLflow service');
        }
    }
}