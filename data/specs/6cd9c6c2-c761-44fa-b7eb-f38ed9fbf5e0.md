# ARC-SCI Research Repos — Spec

## Overview
Two research repositories under `github.com/peymanrah` targeting publication-quality neural architectures for abstract reasoning and compositional generalization.

---

## Repo 1: SCI-ARC (RLAN)
**URL:** https://github.com/peymanrah/SCI-ARC  
**Language:** Python (33%) + HTML (67% — demo/reports)  
**License:** MIT

### What It Is
**RLAN — Relational Latent Attractor Networks for ARC** — a neural architecture for solving ARC-AGI (Abstraction and Reasoning Corpus) tasks through relational reasoning and latent attractor dynamics.

### Architecture (Pipeline)
```
Input Grid (B, H, W)
  → GridEncoder → (B, H, W, 128) embeddings
  → Feature Projection → (B, 128, H, W)
  → DSC (Dynamic Saliency Controller) — Gumbel-softmax spatial attention
  → MSRE (Multi-Scale Relative Encoding) — absolute, normalized, polar coords
  → LCR (Latent Counting Registers) — soft counting for numerical reasoning
  → SPH (Symbolic Predicate Heads) — 8 binary predicates
  → Recursive Solver (ConvGRU, 6 steps)
  → Output Logits (B, 11, H, W)
```

### Model Configurations
| Config | Params | VRAM | Purpose |
|---|---|---|---|
| `rlan_small.yaml` | ~2M | ~12GB | Fast iteration, debugging |
| `rlan_fair.yaml` | ~7.8M | ~20GB | Fair TRM comparison |
| `rlan_large.yaml` | ~51M | ~20GB | Capacity exploration |

### Key Commands
```bash
# Train
python scripts/train_rlan.py --config configs/rlan_fair.yaml
# Evaluate
python scripts/evaluate_rlan.py --checkpoint checkpoints/rlan_fair/best.pt --use-tta
# Test
pytest tests/ -v
# HTML Report
python scripts/analyze_rlan_evaluation.py --results ./evaluation_results --generate-html
```

### Test Status
62+ tests passing (22 module, 16 integration, 7 learning, 16 data, 9 comprehensive).

### Known Issues
- Centroid collapse in DSC (mitigated with `lambda_centroid_diversity=0.5`)
- Solver over-iteration addressed in latest commit
- 1 CUDA-skip test, 1 flaky learning test

### Evaluation Metrics (CISL Parity)
Task Accuracy, Pixel Accuracy, Size Accuracy, Non-Background Accuracy, Color Accuracy (Jaccard), Mean IoU

### Hardware
Optimized for RTX 3090 24GB, CUDA 12.0+, PyTorch 2.1+

---

## Repo 2: SCI (Structural Causal Invariance)
**URL:** https://github.com/peymanrah/SCI  
**Language:** Python (85%) + HTML (15%)  
**License:** MIT  
**Target:** Nature Machine Intelligence

### What It Is
**SCI — Structural Causal Invariance for Compositional Generalization** — achieves **4.4× improvement** on OOD generalization on the SCAN benchmark by separating structural patterns from content.

### Key Results
| Model | In-Dist Acc | OOD Acc | Comp Gen | Struct Inv |
|---|---|---|---|---|
| Baseline | 95.2% | 19.8% | 52.1% | 0.42 |
| SCI (Full) | 98.1% | 87.3% | 91.7% | 0.89 |

### Architecture
Four components integrated with **TinyLlama-1.1B** base model:
1. **Structural Encoder (SE)** with AbstractionLayer — learns structural patterns invariant to content
2. **Content Encoder (CE)** — encodes content independently (orthogonality loss)
3. **Causal Binding Mechanism (CBM)** — cross-attention binding content to structural slots
4. **Structural Contrastive Learning (SCL)** — positive/negative pair training for invariance

### Configuration
- TinyLlama-1.1B base, 12-layer SCI encoders (512d → 2048d)
- AbstractionLayer at layers [3, 6, 9]
- SCL loss weight: 0.3 (with warmup)
- Batch size: 32, fp16 mixed precision
- 7 ablation configs available

### Key Commands
```bash
# Train baseline
python scripts/train_baseline.py --config configs/baseline.yaml --output_dir checkpoints/baseline
# Train SCI full
python scripts/train_sci.py --config configs/sci_full.yaml --output_dir checkpoints/sci_full
# Evaluate
python scripts/evaluate.py --checkpoint checkpoints/sci_full/final.pt --config configs/sci_full.yaml --splits simple length template
# Figures
python scripts/generate_figures.py --results_dir results/ --output_dir figures/generated/
# Test
pytest tests/ -v --cov=sci --cov-report=html
```

### Known Issues
- Extensive bug fix history (V1–V10 reports) — most resolved
- EdgePredictor for Causal Binding Mechanism recently implemented (latest commit)
- Data leakage checks critical (dedicated test category)

---

## Checklist
- [ ] Clone both repos locally
- [ ] Set up Python 3.9+ venv with CUDA/PyTorch for each
- [ ] Verify all tests pass in SCI-ARC (62+)
- [ ] Verify all tests pass in SCI
- [ ] Train RLAN small → fair → evaluate with CISL metrics
- [ ] Train SCI baseline → full model → evaluate on SCAN splits
- [ ] Run 7 SCI ablation studies
- [ ] Address centroid collapse & solver over-iteration (SCI-ARC)
- [ ] Verify EdgePredictor integration (SCI)
- [ ] Generate HTML eval reports (SCI-ARC) and publication figures (SCI)
- [ ] Finalize RLAN paper draft
- [ ] Prepare SCI Nature Machine Intelligence submission

## Risks & Considerations
- **GPU requirements:** Both need RTX 3090 (24GB) minimum; large RLAN config needs careful VRAM management
- **Data:** ARC-AGI-1/2 data needs to be downloaded separately; SCAN data bundled
- **Reproducibility:** Both repos have checkpoint resume support (`--resume auto`)
- **Bug backlog:** SCI has had 10 rounds of bug fixes; regression testing essential
- **Training time:** Full training runs may take hours/days depending on config
