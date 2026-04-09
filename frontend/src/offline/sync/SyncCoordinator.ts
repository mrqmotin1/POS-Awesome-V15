import {
	getSyncResourceDefinitions,
	getSyncResourcesForTrigger,
} from "./resourceRegistry";
import type {
	SyncLifecycleState,
	SyncResourceDefinition,
	SyncResourceId,
	SyncResourceState,
	SyncTrigger,
} from "./types";

type RunResource = (
	resource: SyncResourceDefinition,
	trigger: SyncTrigger,
) => Promise<void>;

type SyncCoordinatorOptions = {
	concurrency?: number;
	resources?: SyncResourceDefinition[];
	runResource?: RunResource;
};

const PRIORITY_WEIGHT: Record<SyncResourceDefinition["priority"], number> = {
	boot_critical: 0,
	warm: 1,
	lazy: 2,
};

function createInitialState(resourceId: SyncResourceId): SyncResourceState {
	return {
		resourceId,
		status: "idle",
		lastSyncedAt: null,
		watermark: null,
		lastSuccessHash: null,
		lastError: null,
		consecutiveFailures: 0,
		scopeSignature: null,
		schemaVersion: null,
	};
}

export class SyncCoordinator {
	private readonly concurrency: number;

	private readonly resources: SyncResourceDefinition[];

	private readonly runResource: RunResource;

	private readonly inFlightTriggers = new Map<SyncTrigger, Promise<void>>();

	private readonly resourceStates = new Map<SyncResourceId, SyncResourceState>();

	constructor(options: SyncCoordinatorOptions = {}) {
		this.concurrency = Math.max(1, options.concurrency || 1);
		this.resources =
			options.resources?.map((resource) => ({
				...resource,
				triggers: [...resource.triggers],
			})) || getSyncResourceDefinitions();
		this.runResource = options.runResource || (async () => undefined);

		for (const resource of this.resources) {
			this.resourceStates.set(resource.id, createInitialState(resource.id));
		}
	}

	getResourceState(resourceId: SyncResourceId) {
		const state = this.resourceStates.get(resourceId);
		return state ? { ...state } : null;
	}

	getResourceStates() {
		return Array.from(this.resourceStates.values()).map((state) => ({
			...state,
		}));
	}

	async runTrigger(trigger: SyncTrigger) {
		const inFlight = this.inFlightTriggers.get(trigger);
		if (inFlight) {
			return inFlight;
		}

		const runPromise = this.executeTrigger(trigger).finally(() => {
			this.inFlightTriggers.delete(trigger);
		});
		this.inFlightTriggers.set(trigger, runPromise);
		return runPromise;
	}

	private async executeTrigger(trigger: SyncTrigger) {
		const resources = this.getResourcesForTrigger(trigger);
		if (!resources.length) {
			return;
		}

		let currentIndex = 0;
		const workerCount = Math.min(this.concurrency, resources.length);
		const workers = Array.from({ length: workerCount }, async () => {
			while (currentIndex < resources.length) {
				const resource = resources[currentIndex];
				currentIndex += 1;
				if (!resource) {
					return;
				}
				await this.executeResource(resource, trigger);
			}
		});

		await Promise.all(workers);
	}

	private getResourcesForTrigger(trigger: SyncTrigger) {
		const triggerResources = this.resources.filter((resource) =>
			resource.triggers.includes(trigger),
		);
		return triggerResources
			.map((resource, index) => ({ resource, index }))
			.sort((left, right) => {
				const priorityDelta =
					PRIORITY_WEIGHT[left.resource.priority] -
					PRIORITY_WEIGHT[right.resource.priority];
				return priorityDelta !== 0 ? priorityDelta : left.index - right.index;
			})
			.map(({ resource }) => resource);
	}

	private async executeResource(
		resource: SyncResourceDefinition,
		trigger: SyncTrigger,
	) {
		this.updateResourceState(resource.id, {
			status: "syncing",
			lastError: null,
		});

		try {
			await this.runResource(resource, trigger);
			this.updateResourceState(resource.id, {
				status: "fresh",
				lastSyncedAt: new Date().toISOString(),
				lastError: null,
				consecutiveFailures: 0,
			});
		} catch (error) {
			this.updateResourceState(resource.id, {
				status: "error",
				lastError:
					error instanceof Error ? error.message : String(error || "Unknown error"),
				consecutiveFailures:
					(this.resourceStates.get(resource.id)?.consecutiveFailures || 0) + 1,
			});
			throw error;
		}
	}

	private updateResourceState(
		resourceId: SyncResourceId,
		patch: Partial<SyncResourceState> & { status?: SyncLifecycleState },
	) {
		const previousState =
			this.resourceStates.get(resourceId) || createInitialState(resourceId);
		this.resourceStates.set(resourceId, {
			...previousState,
			...patch,
		});
	}
}

export function createDefaultSyncCoordinator() {
	return new SyncCoordinator({
		resources: getSyncResourcesForTrigger("boot").length
			? getSyncResourceDefinitions()
			: [],
	});
}
