import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ModelsService {
    private readonly mlflowUrl = 'http://mlflow:5000';
    private readonly experimentName = 'CNN_Face_Attributes_Optimization';

    async getModels() {
        try {
            // 1. Get Experiment ID
            const expResponse = await fetch(
                `${this.mlflowUrl}/api/2.0/mlflow/experiments/get-by-name?experiment_name=${encodeURIComponent(this.experimentName)}`
            );

            if (!expResponse.ok) {
                // If experiment doesn't exist yet, return empty list
                if (expResponse.status === 404) return { models: [], bestModel: null };
                throw new Error(`MLflow error: ${expResponse.statusText}`);
            }

            const expData = await expResponse.json();
            if (!expData.experiment) {
                return { models: [], bestModel: null };
            }

            const experimentId = expData.experiment.experiment_id;

            // 2. Search Runs
            const searchResponse = await fetch(`${this.mlflowUrl}/api/2.0/mlflow/runs/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    experiment_ids: [experimentId],
                    max_results: 50,
                    order_by: ["metrics.val_loss ASC"], // Best loss first
                    filter: "status = 'FINISHED'"
                }),
            });

            if (!searchResponse.ok) {
                throw new Error(`MLflow search error: ${searchResponse.statusText}`);
            }

            const searchData = await searchResponse.json();
            const runs = searchData.runs || [];

            // 3. Format models
            const models = runs.map((run) => {
                const metrics = run.data.metrics || {};
                const params = run.data.params || {};
                const runId = run.info.run_id;
                const runName = run.info.run_name || runId;

                return {
                    id: runId,
                    name: `${runName} (Loss: ${metrics.val_loss?.toFixed(4) || 'N/A'})`,
                    metrics: metrics,
                    params: params,
                    uri: `runs:/${runId}/model`,
                    createdAt: run.info.start_time
                };
            });

            // Since we ordered by val_loss ASC, the first one is the best
            const bestModel = models.length > 0 ? models[0] : null;

            return {
                models,
                bestModel
            };

        } catch (error) {
            console.error('Error fetching models from MLflow:', error);
            throw new InternalServerErrorException('Failed to fetch models from MLflow');
        }
    }
}
