# تقدير العمر القائم على الذكاء الاصطناعي من المشية البشرية في أنظمة المراقبة لتطبيقات الشرطة الذكية - AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

- **المحور:** 5 — الذكاء الاصطناعي و التقنيات الحديثة في المجال الأمني
- **رقم البحث:** 3
- **الباحث/الباحثون:** الدكتور ناصر بن حميد المصلحي
- **الملف على الموقع:** `/papers/track-5/paper-3.pdf`

> نص مستخرج آلياً من ملف PDF (النص الكامل للورقة).

## النص

ISSN 2412-8317
Refereed no. Twenty five

Semi- annual refereed scientific journal issued by Studies and Researches Center at the Sultan Qaboos Academy for Police Sciences

المؤتمرالعلميالدولي الثالث
لأكاديمية السلطان قابوس لعلوم الشرطة
الجرائم العابرة للحدود
التحديات والاستراتيجيات وتقنيات المواجهة
Part three
AI-Based Age Estimation from Human Gait in Surveillance Systems
for Smart Policing Applications
Dr. Nasser Al Musalhi Assistant Professor Faculty of Computer Studies, Arab Open University, Sultanate of Oman nasser.m@aou.edu.om

Dr\ Nasser Al Musalhi

Abstract

Human gait provides a rich source of behavioral

information that can be exploited for soft biometric

analysis while preserving privacy compared with

appearance-based methods. Although skeleton-based

gait recognition has received considerable attention,

continuous chronological age estimation from

pose sequences remains relatively underexplored,

particularly with respect to the influence of camera

viewpoint. This paper proposes a view-dependent deep

temporal multi-task learning framework for human

age estimation using skeleton-based gait sequences

extracted from the OU-MVLP-Pose dataset. The

proposed architecture integrates frame-level feature

encoding, temporal convolution, bidirectional long

short-term memory (BiLSTM), multi-head self-

attention, and temporal attention pooling to learn

discriminative gait representations. Continuous

age regression is treated as the primary task, while

gender classification is incorporated as an auxiliary

task to improve representation learning through

shared feature extraction. Unlike conventional multi-

view approaches that seek viewpoint invariance,

fourteen camera viewpoints are trained and evaluated

independently to investigate the impact of viewing

angle on estimation performance. Experimental

results demonstrate that camera viewpoint

significantly influences age estimation accuracy. The

best performance is achieved at the 15° front-oblique

viewpoint, yielding a mean absolute error (MAE) of

7.35 years, root mean squared error (RMSE) of 10.56

years,

, a Pearson correlation

coefficient of 0.798, and 50.69% of predictions within

±5 years of the ground-truth age. In contrast, the 210°

rear-oblique viewpoint produces the lowest accuracy,

confirming the importance of viewpoint selection

in gait-based demographic analysis. These findings

demonstrate that skeleton-only gait sequences contain

meaningful age-related information and establish

a comprehensive benchmark for view-dependent

chronological age estimation, providing practical

insights for the design and deployment of gait-based

soft biometric systems.

based gait, deep learning, temporal learning, multitask learning, soft biometrics, OU-MVLP-Pose.

Keywords: Age estimation, gait analysis, skeleton-

Issue Fiftieth – November 2026

23

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

1. Introduction
Artificial intelligence (AI) has significantly transformed computer vision by enabling automated analysis of human attributes from visual data. Among these attributes, human age estimation has attracted considerable attention because it provides valuable demographic information for a wide range of applications, including intelligent surveillance, forensic investigation, healthcare monitoring, human– computer interaction, access control, and public safety. Accurate age estimation can support decisionmaking when personal identity is unknown or cannot be immediately established, making it an important component of modern intelligent monitoring systems (Sepas-Moghaddam & Etemad, 2023; Güner Şahan et al., 2024).
One particularly important application is smart policing, where law enforcement agencies increasingly rely on AI-assisted surveillance to support criminal investigations and public safety operations. In many cases, investigators initially possess only limited information about an individual, such as an approximate age, gender, body build, or walking behavior captured by surveillance cameras. This situation frequently occurs during investigations involving suspects, missing persons, unidentified individuals, or victims, where facial images are unavailable, partially occluded, or of insufficient quality for reliable facial recognition. An AI-based human age estimation system capable of inferring age from gait can assist investigators by narrowing the search space, prioritizing candidate lists, and providing complementary demographic evidence before identity is confirmed. Such information is intended to support, rather than replace, existing forensic and investigative procedures, while preserving individual privacy because gait analysis relies on body movement rather than facial appearance (Sepas-Moghaddam & Etemad, 2023).
Although facial analysis remains the dominant approach for age estimation, its performance often deteriorates under unconstrained conditions due to poor illumination, low image resolution, occlusion, extreme viewing angles, and privacy restrictions.

These limitations have motivated researchers to investigate alternative biometric modalities that remain reliable when facial information is unavailable or unsuitable for analysis (Güner Şahan et al., 2024).
Human gait represents one of the most promising alternative biometric modalities because walking behavior naturally changes throughout the aging process. Physiological changes associated with aging—including reduced joint flexibility, altered posture, decreased walking speed, shorter stride length, and variations in inter-limb coordination— produce measurable differences in gait dynamics that can be captured from a distance without requiring subject cooperation. Unlike facial biometrics, gait remains observable in many surveillance scenarios where facial characteristics cannot be reliably extracted, making it particularly attractive for intelligent surveillance and forensic applications (Sepas-Moghaddam & Etemad, 2023).
Recent advances in human pose estimation have further accelerated gait analysis by enabling human motion to be represented as sequences of anatomical joint coordinates. Skeleton-based gait representations preserve the essential kinematic characteristics of human movement while discarding much of the appearance-dependent information contained in RGB images. Consequently, they are generally more robust to variations in clothing, carried objects, illumination, and background clutter, while offering improved privacy preservation compared with appearancebased representations (Teepe et al., 2022; Fan et al., 2024). Recent studies have demonstrated that deep learning models operating directly on pose sequences can achieve highly competitive performance in gait recognition and behavioral biometrics (Wei et al., 2024; Yunardi et al., 2024).
Despite these advances, AI-based human age estimation from skeleton-based gait remains relatively underexplored. Existing research has focused predominantly on person identification and gait recognition, whereas comparatively few studies have investigated continuous chronological age estimation from skeleton sequences. Furthermore, the limited number of gait-based age estimation studies

24

Issue Fiftieth – November 2026

Dr\ Nasser Al Musalhi

commonly formulate the problem as age-group classification rather than continuous age regression. While age-group classification is appropriate for coarse demographic analysis, many practical applications—including forensic investigation and intelligent surveillance—benefit from estimating an individual’s chronological age as accurately as possible.
Another important consideration is the influence of camera viewpoint. Human gait appearance varies substantially across viewing angles because body joints become differently visible, partially occluded, or geometrically distorted depending on camera orientation. Although large-scale gait datasets provide observations from multiple viewpoints, relatively little attention has been given to understanding how individual viewpoints affect continuous age estimation from skeleton-based gait. Identifying viewpoints that preserve the most informative agerelated motion characteristics can provide valuable guidance for designing future AI-assisted surveillance and smart policing systems.
To address these challenges, this paper proposes an AI-based human age estimation framework from skeleton-based gait using deep temporal learning. The proposed framework integrates frame-level feature encoding, temporal convolutional learning, bidirectional long short-term memory (BiLSTM), multi-head self-attention, and temporal attention pooling to capture both local gait dynamics and long-range temporal dependencies. Continuous chronological age estimation is formulated as the primary task, while gender classification is incorporated as an auxiliary task to enhance representation learning through shared temporal features. The proposed model is evaluated using the OU-MVLP-Pose dataset (An et al., 2020), where independent models are trained and tested for each of the fourteen camera viewpoints to investigate the influence of viewpoint on age estimation performance.
The primary objective of this study is to develop and evaluate an AI-based framework for continuous chronological age estimation from skeleton-based gait sequences, with potential application in smart

policing and the analysis of surveillance and crimescene evidence. Specifically, the study aims to:
a. Develop a deep temporal learning framework for continuous chronological age estimation using skeleton-based gait sequences without relying on facial or appearance-based information.
b. Investigate the influence of camera viewpoint on age-estimation performance by independently training and evaluating models across fourteen viewing angles.
c. Identify the camera viewpoints that preserve the most informative age-related gait characteristics.
d. Evaluate the effectiveness of the proposed framework using multiple regression and errorbased performance measures.
e. Examine the potential of skeleton-based age estimation as supplementary soft-biometric information for smart-policing and crime-scene analysis, while recognizing the need for human oversight and appropriate ethical and privacy safeguards.
Accordingly, this study is guided by the following research questions, which examine both the feasibility of continuous age estimation from skeleton-based gait and the specific influence of camera viewpoint on estimation performance:
RQ1. To what extent can skeleton-based gait sequences support continuous chronological age estimation without relying on appearance-based information?
RQ2. How does camera viewpoint affect the performance of continuous chronological age estimation from skeleton-based gait sequences?
RQ3. Which camera viewpoints provide the most informative gait representations for chronological age estimation?
Experimental results demonstrate that the proposed framework effectively learns age-related gait characteristics from skeleton sequences, with the 15° front-oblique viewpoint achieving the highest

Issue Fiftieth – November 2026

25

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

prediction accuracy, corresponding to a mean absolute error (MAE) of 7.35 years, RMSE of 10.56 years,
of 0.636, and a Pearson correlation coefficient of 0.798. These findings demonstrate the feasibility of AI-based age estimation from skeleton-based gait and provide practical guidance for the development of intelligent gait analysis systems that can support smart surveillance and policing applications.
The main contributions of this work are summarized as follows:
a. A deep temporal multi-task learning framework is proposed for continuous chronological age estimation from skeleton-based gait sequences by integrating temporal convolution, BiLSTM, selfattention, and temporal attention pooling with auxiliary gender classification.
b. A comprehensive viewpoint-dependent evaluation is conducted using all fourteen camera viewpoints of the OU-MVLP-Pose dataset, enabling a systematic investigation of how camera orientation influences continuous age estimation performance.
c. Extensive experimental results demonstrate that camera viewpoint has a significant impact on age estimation accuracy, with the 15° front-oblique viewpoint consistently providing the most informative gait representation. These findings provide practical guidance for designing future skeleton-based gait age estimation systems.
2. Related Work
2.1. Skeleton-Based Gait Recognition
Human gait recognition has become an important area of behavioral biometrics because it enables individuals to be analyzed at a distance without requiring active cooperation. Conventional gaitrecognition methods have predominantly relied on appearance-based representations, particularly silhouettes and Gait Energy Images (GEIs). Although such representations encode useful body-shape and motion information, their reliability can be affected by variations in clothing, carried objects, illumination, background conditions, and silhouette segmentation. Advances in human pose estimation

have consequently encouraged the development of model-based gait representations in which walking behavior is characterized through anatomical joint coordinates rather than appearance information (Sepas-Moghaddam & Etemad, 2023).
Large-scale pose datasets have played an important role in this transition. An et al. (2020) introduced OU-MVLP-Pose by extending the largescale OU-MVLP gait database with pose sequences. The dataset contains more than 10,000 subjects observed from 14 camera viewpoints, providing an important benchmark for evaluating model-based gait-recognition methods under substantial viewpoint variation. The availability of pose sequences enables gait to be represented through body-joint trajectories while reducing dependence on appearance characteristics such as clothing texture and color.
Teepe et al. (2022) demonstrated that human pose sequences preserve sufficient structural and temporal information for competitive gait recognition. Their study showed that explicitly exploiting the anatomical structure of the skeleton can improve recognition compared with representations that treat joints independently. These findings established skeletonbased gait as a viable alternative to conventional appearance-based representations and highlighted the importance of preserving relationships among body joints during feature extraction.
More recent research has investigated alternative mechanisms for organizing and learning skeleton representations. Fan et al. (2024) proposed SkeletonGait, which transforms pose sequences into structured skeleton maps that enable convolutional neural networks to exploit spatial relationships among joints while retaining temporal information. Their results across public gait datasets demonstrated that appropriately structured skeleton representations can provide strong discriminative performance and can complement conventional silhouette-based gait information.
Temporal and multi-scale skeletal representations have also been investigated. He et al. (2023) proposed a multi-scale spatio-temporal network that models

26

Issue Fiftieth – November 2026

Dr\ Nasser Al Musalhi

skeletal gait information at different spatial and temporal resolutions. Such approaches recognize that discriminative gait characteristics arise not only from individual joint locations but also from coordinated movement among different body regions across time. Similarly, Wei et al. (2024) proposed GaitDLF, a global-and-local fusion framework that combines holistic body motion with localized body-part representations. Their findings indicate that integrating complementary spatial information can improve gaitrecognition robustness, particularly under challenging viewing and environmental conditions.
Skeleton-based gait recognition has additionally benefited from architectures explicitly designed to capture temporal dynamics. Yunardi et al. (2024), for example, combined modified deep convolutional neural networks with Long Short-Term Memory (LSTM) modeling for skeleton-based person recognition, demonstrating the value of jointly learning spatial and sequential gait characteristics.
Collectively, these studies demonstrate that skeleton sequences preserve rich structural and temporal information for gait analysis while reducing dependence on appearance-specific characteristics (Fan et al., 2024; He et al., 2023; Teepe et al., 2022; Wei et al., 2024; Yunardi et al., 2024). Nevertheless, contemporary skeleton-based gait research has been dominated by person identification and recognition. The exploitation of skeleton-only gait representations for demographic inference, particularly continuous chronological age estimation, has received substantially less attention.
2.2. Deep Temporal Learning for Human Motion Analysis
Human gait is fundamentally a spatio-temporal process in which meaningful information emerges from coordinated body movement across a sequence rather than from isolated poses. Effective gait analysis therefore requires models capable of capturing short-term motion transitions, long-range temporal dependencies, and interactions among different anatomical regions.
Convolutional architectures provide an effective mechanism for extracting local spatial and temporal patterns, whereas recurrent neural networks are

particularly suited to sequential dependencies. Long Short-Term Memory networks and their bidirectional variants can retain information across extended sequences and have therefore been widely applied to human-motion analysis. In skeleton-based gait recognition, Yunardi et al. (2024) demonstrated that combining convolutional feature extraction with LSTM-based temporal modeling can capture complementary spatial and sequential characteristics from pose sequences.
Spatio-temporal graph-based approaches provide another mechanism for representing human motion because a skeleton naturally forms a graph in which anatomical joints correspond to nodes and physical connections correspond to edges. Teepe et al. (2022) showed that explicitly incorporating skeletal topology enables models to exploit structural relationships between joints rather than processing individual joint coordinates independently. He et al. (2023) extended spatio-temporal modeling through a multi-scale strategy designed to capture gait characteristics at different spatial and temporal resolutions. These findings support the general principle that both anatomical structure and temporal evolution are important for extracting discriminative gait representations.
Recent research has also emphasized global and local feature integration. Wei et al. (2024) demonstrated through GaitDLF that holistic body movement and localized body-part characteristics provide complementary information. Similarly, SkeletonGait organizes joint information into structured maps that allow convolutional processing to preserve relationships between body regions while extracting discriminative gait characteristics (Fan et al., 2024). These approaches indicate that human gait should not be represented solely through global motion or isolated joints; rather, useful information is distributed across multiple body regions and temporal scales.
Attention mechanisms further extend temporal representation learning by allowing a network to assign different importance to individual observations and establish relationships between temporally distant frames. This property is particularly relevant to gait

Issue Fiftieth – November 2026

27

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

because different phases of the walking cycle may contribute unequally to biometric or demographic inference. Huang et al. (2025) applied an attentionaware spatio-temporal framework to multi-view gait-based age estimation and gender classification. Their work highlighted an important limitation of conventional GEI-based approaches: compressing a gait sequence into a static representation can reduce the explicit modeling of temporal dynamics. Their results support the use of attention mechanisms for extracting demographic information from spatial and temporal gait characteristics.
The existing literature therefore suggests that convolutional, recurrent, graph-based, and attention mechanisms capture complementary aspects of human motion. Convolutional operations efficiently characterize local transitions, recurrent architectures preserve sequential continuity, and attention mechanisms enable selective emphasis on informative temporal observations. This provides the methodological basis for hybrid temporal architectures that integrate multiple mechanisms to learn age-related characteristics from skeleton sequences.
2.3. Gait-Based Human Age Estimation
Compared with gait-based person recognition, demographic inference from gait constitutes a more specialized soft-biometric problem. Human locomotion changes throughout the lifespan as a consequence of physiological and biomechanical development and aging. Changes in walking velocity, stride characteristics, posture, balance, joint mobility, and inter-limb coordination can therefore produce age-related patterns that are observable in gait. This makes gait particularly relevant for age estimation in situations where facial information is unavailable, occluded, or captured at insufficient resolution.
Early gait-based age-estimation approaches primarily relied on handcrafted or appearanceoriented gait representations. Li et al. (2018) proposed an age-group-dependent framework combining age-group classification, manifold learning, and regression. Their approach was motivated by the

observation that gait does not change uniformly across the lifespan. Subjects were first assigned to age groups using a directed acyclic graph support vector machine, after which group-specific support vector regression models were employed for continuous age estimation. Evaluation on the large-scale OULP-Age dataset demonstrated that explicitly accounting for different age-dependent gait patterns could improve chronological age estimation.
Deep-learning approaches subsequently enabled age-related gait representations to be learned directly from data. Sakata et al. (2019) proposed a multi-stage convolutional neural network in which gender estimation and age-group estimation precede continuous chronological age regression. Their framework is particularly relevant because it demonstrated that demographic attributes can provide complementary information for gait-based age prediction. However, the method relied primarily on appearance-oriented gait representations rather than skeleton-only joint trajectories.
Zhu et al. (2020) addressed gait-based age estimation from an ordinal-learning perspective. Rather than treating individual ages as unrelated regression targets, their ordinal distribution regression approach exploits the inherent ordered relationship among chronological ages. A global-andlocal convolutional architecture was used to capture both holistic gait characteristics and information associated with individual body regions. Their results demonstrated the value of explicitly incorporating ordinal age relationships into the learning objective.
The uncertainty associated with chronological age predictions has also been investigated. Sakata et al. (2020) proposed an uncertainty-aware gait-based age-estimation framework based on label distribution learning. Rather than treating the estimated age as an entirely deterministic output, their formulation considers uncertainty in age prediction. This direction is important for practical applications because gaitderived chronological age should be interpreted as an estimate rather than an exact demographic measurement.

28

Issue Fiftieth – November 2026

Dr\ Nasser Al Musalhi

Research has also moved toward richer spatial and temporal representations. Huang et al. (2025) proposed an attention-aware spatio-temporal framework for multi-view gait-based age estimation and gender classification. The method was motivated in part by limitations of GEI-based representations, which compress a walking sequence and consequently reduce explicit representation of temporal gait dynamics. By jointly exploiting spatial and temporal information with attention mechanisms, their framework demonstrated the importance of dynamic gait characteristics for demographic inference under multiple viewing conditions.
A different direction has focused on structured three-dimensional human-body representations. Li et al. (2025) proposed GaitAGE, an age- and genderestimation framework based on an age- and genderspecific three-dimensional human model. Instead of relying solely on conventional silhouette or GEI representations, GaitAGE employs the Skinned Multi-Person Linear (SMPL) model to represent human body characteristics in three dimensions. The framework was designed to improve robustness to gait covariates, including variations in camera viewpoint, and illustrates the increasing movement toward structured model-based representations for demographic gait analysis.
Other studies have investigated age information directly from biomechanical gait parameters. Kuroda et al. (2025) developed a walking-age estimator using gait parameters and kernel regression. Their work demonstrated that interpretable locomotor characteristics can contain sufficient information for continuous age prediction, providing further evidence that chronological aging is reflected in walking behavior. Such parameter-based approaches, however, differ from end-to-end deep learning methods that learn age-related representations directly from complete pose sequences.
Recent graph-based research has additionally examined age-group inference using skeletal relationships. Aderinola et al. (2024) proposed an adaptive graph neural network for gait-based age-group classification, demonstrating that

graph representations can exploit relationships among body joints for age-related gait analysis. Although this approach formulates age inference as categorical classification rather than continuous chronological regression, it provides further evidence that skeletal structure contains agediscriminative information.
2.4. Research Gap
Existing studies demonstrate that gait-based age estimation has been addressed using regression, deep learning, ordinal learning, uncertainty-aware methods, and spatio-temporal approaches (Huang et al., 2025; Li et al., 2018; Sakata et al., 2019, 2020; Zhu et al., 2020). More recent work has also explored graph-based skeletal representations and three-dimensional human models for age-related gait analysis (Aderinola et al., 2024; Li et al., 2025). Therefore, continuous gait-based age estimation itself is not an unexplored problem.
However, two important gaps remain. First, much of the existing age-estimation literature relies on silhouettes, Gait Energy Images (GEIs), handcrafted gait parameters, or 3D body representations, while continuous chronological age estimation directly from skeleton-only temporal joint sequences remains comparatively underexplored. Although skeletonbased representations have demonstrated strong performance in gait recognition (Fan et al., 2024; He et al., 2023; Teepe et al., 2022), their potential for fine-grained chronological age regression has received less attention.
Second, previous multi-view studies have primarily focused on achieving robustness across different camera orientations (Huang et al., 2025; Li et al., 2025), rather than systematically determining how each individual viewpoint affects age-estimation accuracy. Combining multiple viewpoints may obscure the intrinsic contribution of specific camera orientations.
To address these gaps, the present study performs view-dependent continuous age estimation from skeleton-only gait sequences. Fourteen camera viewpoints are trained and evaluated

Issue Fiftieth – November 2026

29

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

independently using identical subject-independent partitions, architecture, and optimization settings. This controlled design isolates the effect of camera orientation and provides a systematic assessment of which viewpoints preserve the most informative age-related gait characteristics.
3. Methodology
3.1. Overview
This study proposes a view-dependent deep temporal learning framework for chronological human age estimation from skeleton-based gait sequences. Unlike conventional multi-view gait learning approaches, which combine samples acquired from different camera viewpoints during model training, the proposed framework treats each camera view as an independent learning problem. Consequently, fourteen independent deep neural networks are trained and evaluated separately, allowing the influence of individual viewpoints on age estimation performance to be investigated systematically.
The proposed framework uses only human pose sequences as input, thereby eliminating dependence on appearance information such as clothing, texture, colour, or illumination. Instead, the model learns temporal motion characteristics directly from anatomical joint trajectories. Chronological age regression constitutes the primary learning objective, while gender classification is incorporated as an auxiliary task to encourage the extraction of more discriminative gait representations through multi-task learning. Figure 1 illustrates the overall architecture of the proposed framework.
3.2. Dataset
Experiments were conducted using the OUMVLP-Pose dataset, one of the largest publicly available pose-based gait datasets. The dataset was introduced by An et al. (2020) as an extension of the original OU-MVLP database by replacing silhouette sequences with human pose sequences estimated using state-of-the-art pose estimation

algorithms. The primary objective of the dataset is to facilitate the development and evaluation of model-based gait recognition methods that are less sensitive to appearance variations than silhouettebased approaches
The dataset contains gait sequences from 10,307 subjects captured simultaneously by seven synchronized cameras positioned at 15° intervals, producing 14 viewing angles (0°, 15°, 30°, 45°, 60°, 75°, 90°, 180°, 195°, 210°, 225°, 240°, 255°, and 270°). Each walking sequence contains approximately 18–35 frames, with most sequences comprising around 25 frames, recorded at a resolution of 1280 × 980 pixels and a frame rate of 25 frames per second. Human pose sequences were extracted using both OpenPose and AlphaPose, enabling researchers to evaluate pose-based gait analysis independently from appearance-based representations.
To support chronological age estimation, the original dataset was enriched using subject metadata containing the subject identifier, chronological age, and gender. Following data cleaning, subjects with incomplete or invalid demographic information were excluded, resulting in a complete metadata table that was linked directly to each pose sequence through the subject identifier.
3.3.Independent View Learning Protocol
Most existing gait recognition studies aim to learn view-invariant representations by combining gait sequences acquired from multiple camera viewpoints during training. Although such an approach is effective for person identification, it obscures the contribution of individual viewpoints when estimating soft biometric characteristics such as age.
To overcome this limitation, the proposed framework adopts a view-dependent learning protocol, in which every camera viewpoint is considered an independent learning task. Instead of training a single model using all viewpoints simultaneously, fourteen independent models are trained separately, each using samples

30

Issue Fiftieth – November 2026

Dr\ Nasser Al Musalhi

acquired from only one camera angle. No pose sequence from any other viewpoint is included during training, validation, or testing of a given model.
This experimental protocol enables a direct comparison of viewpoint-specific performance and provides a systematic analysis of how camera orientation influences chronological age estimation. Furthermore, because no information is shared between viewpoints, the reported performance reflects the intrinsic discriminative capability of each individual camera angle.
3.4.Data Preparation
Each pose sequence was stored as a NumPy array (.npy), where the filename corresponds uniquely to the subject identifier contained in the metadata table. This naming convention enabled each sequence to be associated directly with the subject’s chronological age and gender without manual annotation.
To prevent subject leakage, a subjectindependent partitioning strategy was adopted. The dataset was first divided according to subject identity, ensuring that pose sequences belonging to the same individual were never distributed across different subsets. Approximately 80% of the subjects were allocated to the development set, while the remaining 20% were reserved exclusively for final testing. Subsequently, the development set was further partitioned into training and validation subsets while preserving the subject-independent constraint. As a result, every individual appeared in only one subset throughout the entire experimental process.
During data loading, pose sequences were validated to ensure that all samples satisfied the expected tensor dimensions (30 × 18 × 5) and contained only finite numerical values. Minor Gaussian perturbations were applied to joint coordinates and motion features during training to improve generalisation while preserving the underlying gait dynamics.

3.5.Proposed Deep Temporal Multi-Task Network
The proposed architecture was designed to learn discriminative temporal gait representations directly from pose sequences. Unlike graphbased approaches that explicitly model skeletal connectivity, the proposed framework represents each frame as a compact feature vector before modelling temporal dependencies across the walking sequence.
Initially, the joint coordinates within each frame are flattened into a one-dimensional feature vector and normalized using layer normalization. A frame encoder consisting of fully connected layers projects the raw pose representation into a higherdimensional latent feature space. These framelevel representations are subsequently processed using a stack of Temporal Convolutional Network (TCN) blocks, which efficiently capture short-term temporal patterns and local motion dynamics.
The resulting temporal features are then passed to a bidirectional Long Short-Term Memory (BiLSTM) network, enabling the model to capture long-range sequential dependencies by processing the walking sequence in both forward and backward directions simultaneously. To further improve temporal representation learning, a multi-head self-attention module is employed to model global relationships between frames and allow the network to focus on the most informative temporal interactions. Finally, a temporal attention pooling layer aggregates frame-level features into a compact sequence-level representation by assigning larger weights to frames that contribute more strongly to age estimation.
The aggregated representation is subsequently forwarded to a shared latent feature space from which two prediction heads are constructed:
· Age regression head, responsible for predicting continuous chronological age.
· Gender classification head, serving as an auxiliary learning task.

Issue Fiftieth – November 2026

31

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications The overall architecture is illustrated in Figure 1.

Figure 1: proposed Methodology

32

Issue Fiftieth – November 2026

Dr\ Nasser Al Musalhi

3.6. Multi-Task Learning Objective
Chronological age estimation constitutes the primary optimisation objective of the proposed framework. Since age is a continuous variable, regression is formulated using the Smooth L1 (Huber) loss, which combines the robustness of the L1 loss with the stability of the L2 loss and is less sensitive to outliers.
To encourage the network to learn richer gait representations, gender classification is incorporated as an auxiliary task using the standard cross-entropy loss. The final optimisation objective is expressed as

where denotes the Smooth L1 regression loss,

represents the cross-entropy classification loss,

and controls the contribution of the auxiliary task. In

all experiments,

, ensuring that chronological

age estimation remains the dominant optimisation

objective while allowing gender supervision to

improve feature learning.

4. Experimental Setup

4.1. Experimental Configuration

All experiments were implemented using PyTorch 2.11 and executed on a workstation equipped with an NVIDIA GeForce RTX 5080 GPU (16 GB) with CUDA 12.8 acceleration. Mixed-precision training (Automatic Mixed Precision) was employed to reduce memory consumption and accelerate computation without affecting prediction accuracy.

To ensure experimental reproducibility, deterministic execution was enabled by fixing the random seeds for Python, NumPy, and PyTorch. Deterministic cuDNN operations were used throughout the experiments, and identical training settings were maintained for all viewpoint-specific models.

4.2. Training Configuration

All view-specific models were optimized using

AdamW with an initial learning rate of

,a

weight decay of

, and a batch size of 128.

Training was limited to 100 epochs.

A ReduceLROnPlateau scheduler monitored validation MAE. The learning rate was reduced by a factor of 0.5 when validation MAE did not improve

for five consecutive epochs, with a lower bound of . Early stopping was applied with a patience
of 15 epochs and a minimum improvement threshold of 0.01 years. The model checkpoint achieving the lowest validation MAE was retained for final testing.
An exponential moving average of the trainable parameters was maintained after a five-epoch warmup period using a decay factor of 0.99. During model evaluation, the EMA checkpoint was used because it provided more stable parameter estimates than the instantaneous network weights. Minor Gaussian perturbations were applied to the pose coordinates and motion features during training only. The principal training hyperparameters are summarized in Table 1.
Table 1. Training Configuration

Parameter Optimizer Initial learning rate
Weight decay Batch size Maximum epochs Learning-rate scheduler LR reduction factor Scheduler patience Minimum learning rate Early stopping patience EMA decay EMA warm-up

Value AdamW
128 100 ReduceLROnPlateau 0.5 5 epochs
15 epochs 0.99
5 epochs

4.3. Evaluation Measures
Age-estimation performance was assessed using Mean Absolute Error (MAE), Median Absolute Error, Root Mean Squared Error (RMSE), the coefficient of determination ( ), and the Pearson correlation coefficient. MAE was treated as the primary metric because it expresses the average estimation error directly in years.The cumulative score within five years, CS( ), was also reported:

Issue Fiftieth – November 2026

33

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

Here, and denote the actual and predicted ages of subject , respectively, and is the indicator function.
The median, 75th-percentile, and 90th-percentile absolute errors were additionally examined to determine whether performance differences were caused by typical errors or by a smaller number of difficult cases.
4.4. Comparative Procedure
The same architecture, hyperparameters, random seed, and subject partitions were used for all fourteen viewpoints. Each viewpoint was trained and evaluated independently. Consequently, variations in the reported results reflect differences in the information available from each camera angle rather than changes in the model or optimization procedure.
5. Results and Discussion
5.1. Overall View-Dependent Performance
Table 2 presents the results obtained from the fourteen independently evaluated camera viewpoints.

The findings show a clear dependence between camera orientation and chronological age-estimation accuracy.
The best overall result was achieved at , with an MAE of 7.35 years, a Median Absolute Error of 4.91 years, an RMSE of 10.56 years, an of 0.636, and a Pearson correlation of 0.798. This viewpoint also achieved the highest CS( ) value, with 50.69% of subjects estimated within five years of their actual age.
The viewpoint produced the second-lowest MAE at 7.59 years, followed by at 7.98 years and
at 8.03 years. By contrast, the weakest result was observed at , where MAE increased to 10.26 years, RMSE reached 14.26 years, and decreased to 0.327.
The difference between the best and worst MAE was 2.91 years. Relative to the result, the error at
was approximately 39.6% higher. This variation confirms that viewpoint is not a minor acquisition factor but a major determinant of skeleton-based ageestimation performance.

Table 2. Age-Estimation Results Across the Fourteen Viewpoints

View
0° 15° 30° 45° 60° 75° 90° 180° 195° 210° 225° 240° 255° 270°

Samples
1,702 1,807 1,946 1,907 1,806 1,963 1,945 1,800 1,852 1,963 1,903 1,786 1,963 1,933

MAE
7.98 7.35 8.03 8.13 7.59 8.34 9.34 9.85 9.28 10.26 9.40 9.59 9.15 9.26

Median AE
5.23 4.91 5.62 5.64 5.06 5.72 6.58 7.39 6.96 7.63 6.98 7.05 6.14 6.25

RMSE
11.62 10.56 11.61 11.67 11.19 12.03 13.39 13.44 13.18 14.26 13.27 13.63 13.33 13.32

0.550 0.636 0.559 0.552 0.587 0.525 0.415 0.389 0.427 0.327 0.417 0.382 0.416 0.425

Pearson (r)
0.746 0.798 0.753 0.748 0.768 0.727 0.648 0.625 0.660 0.580 0.647 0.623 0.659 0.659

47.83% 50.69% 46.40% 46.57% 49.94% 46.82% 42.57% 38.28% 40.87% 38.16% 41.04% 41.49% 44.42% 43.66%

34

Issue Fiftieth – November 2026

Dr\ Nasser Al Musalhi

5.2. Actual Versus Predicted Age for the Best Viewpoint

Figure 2 presents the relationship between actual and predicted chronological age for the best-performing
viewpoint. The scatter points generally follow the identity line, indicating a strong agreement between the model predictions and the ground-truth ages. This observation is consistent with the quantitative results obtained for this viewpoint, including an MAE of 7.35 years, an RMSE of 10.56 years, an value of 0.636, and a Pearson correlation coefficient of 0.798.
The plot also reveals a regression-to-themean tendency. Younger subjects are occasionally predicted as older, whereas older subjects are more frequently underestimated. This pattern suggests that the model captures the overall age progression from gait but remains less accurate at the extremes of the age distribution. The reduced prediction range may be partly associated with fewer training samples in the youngest and oldest age groups and with greater within-age gait variability among older adults.

Figure 3. Mean Absolute Error across the fourteen independently evaluated camera viewpoints.
The pattern suggests that slightly oblique frontal observations retain a useful combination of upperand lower-body motion. At , bilateral limb coordination, trunk inclination, shoulder movement, and leg trajectories remain visible without the severe overlap that can arise in a strictly frontal view. This combination appears to provide stronger age-related information than a pure side or rear view.
The lateral view produced an MAE of 9.34 years, notably higher than the frontal-oblique views. Although the side view clearly exposes stride and sagittal leg movement, it suppresses bilateral symmetry, shoulder-width changes, and frontal trunk dynamics. These results indicate that the viewpoint traditionally favored for gait identification is not necessarily optimal for chronological age estimation.

5.4. Error Magnitude and Large-Error Cases

RMSE followed a similar pattern to MAE. The lowest RMSE was obtained at , while the highest occurred at . Figure 4 represent the model behaviur.

Figure 2. Actual versus predicted chronological age for the best-performing viewpoint.
5.3. MAE Variation Across Viewpoints
Figure 3 shows the MAE for each camera angle. The lowest errors were concentrated in the frontal and front-oblique region, particularly at and . Error increased sharply at and remained comparatively high throughout the rear-facing viewpoints.

Figure 4. Root Mean Squared Error across the 14 camera viewpoints.

Issue Fiftieth – November 2026

35

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

5.5. Cumulative Accuracy Within Five Years

overlap.

Figure 5 reports CS( ), representing the proportion of test predictions with an absolute error no greater than five years.

Third, rear-view degradation was reflected across every reported metric. Rear-oblique viewpoints exhibited higher MAE and RMSE, lower and correlation, weaker CS( ), and larger upperpercentile errors. This consistency indicates that rear-facing pose sequences provide a less informative representation of age-related gait characteristics.

Figure 5. Percentage of predictions falling within ±5 years of chronological age.
The viewpoint achieved the highest score at 50.69%, closely followed by at 49.94% and at 47.83%. The weakest scores were recorded at and , at 38.16% and 38.28%, respectively.
This finding has practical significance because it expresses performance in a directly interpretable form. Under the strongest viewing condition, approximately one in two subjects was estimated within five years of the true age. Under the weakest rear-oblique condition, this proportion decreased to fewer than two in five.
5.6. Discussion
The results establish three main findings.
First, skeleton-only gait sequences contain sufficient information to support continuous chronological age regression. The best model achieved an MAE of 7.35 years and a correlation of 0.798 without using facial appearance, clothing texture, silhouettes, or RGB imagery.
Second, age estimation is strongly viewpointdependent. The frontal and front-oblique viewpoints from to generally outperformed the lateral and rear viewpoints. The most informative orientation was not the exact frontal angle but the slightly oblique
angle. This perspective appears to balance the visibility of bilateral body motion with reduced joint

The results also show that view-dependent evaluation reveals information that would be obscured by pooling all viewpoints into a single model. A multi-view aggregate score could conceal the 2.91-year MAE difference between the best and worst orientations. The independent-view protocol therefore offers both methodological and operational value by identifying the camera positions most suitable for age-oriented gait analysis.
A limitation is that the current analysis does not determine which individual joints or gait phases account for the observed performance differences. In addition, the model exhibits larger errors for difficult subjects, as shown by the 90th-percentile results. Future work should examine age-wise error patterns, joint-level attention, uncertainty estimation, and carefully controlled multi-view fusion. Such extensions could reduce extreme errors while retaining the interpretability provided by viewpointspecific evaluation.
5.7. Ethical, Legal, and Operational Considerations
The proposed framework is intended to support smart-policing applications by assisting in the analysis of surveillance footage and crime-scene evidence, particularly when facial or identity information is unavailable or unreliable. However, gait-based age predictions should be treated as approximate softbiometric information and used only to complement other forensic and investigative evidence, rather than as independent evidence of identity, age, or criminal involvement.
Potential algorithmic bias and demographic differences should be considered, as performance may vary across age groups, gender, and camera

36

Issue Fiftieth – November 2026

Dr\ Nasser Al Musalhi

viewpoints. Privacy and proportionality must also govern the collection, processing, retention, and access to gait data and crime-scene evidence in accordance with applicable legal and data-protection requirements. Human oversight should therefore remain essential, with investigators considering model predictions alongside other available evidence to minimize false investigative leads and ensure accountability.

or RGB imagery. Nevertheless, the remaining error range of approximately 7–10 years indicates that exact age estimation from gait is still a challenging problem. Future work will focus on uncertaintyaware regression, age-balanced learning, joint-level interpretability, and controlled multi-view fusion to reduce large prediction errors and improve robustness across difficult viewpoints and underrepresented age ranges.

6. Conclusion

References

This study presented a view-dependent deep temporal learning framework for continuous human age estimation from skeleton-based gait sequences. Rather than combining multiple viewpoints into a single model, fourteen camera views were evaluated independently using the same architecture, subject partitions, and optimization settings. This design made it possible to isolate the effect of viewpoint on chronological age-estimation performance.
The results confirmed that gait-based age estimation is strongly viewpoint-dependent. The
front-oblique view achieved the best overall performance, with an MAE of 7.35 years, an RMSE of 10.56 years, an of 0.636, a Pearson correlation of 0.798, and a CS( ) of 50.69%. In contrast, the
rear-oblique view produced the weakest result, with an MAE of 10.26 years. The 2.91-year gap between the best and worst viewpoints demonstrates that camera orientation has a substantial influence on the visibility of age-related gait characteristics.
The findings also showed that front and frontoblique views generally preserve more informative combinations of trunk posture, bilateral limb coordination, and arm–leg dynamics than lateral and rear views. This suggests that camera placement should be treated as an important design consideration in gait-based soft-biometric systems, particularly when the objective is chronological age estimation rather than identity recognition.
Overall, the proposed approach demonstrates that skeleton-only gait sequences can provide meaningful age-related information without relying on facial appearance, silhouettes, clothing texture,

Aderinola, T. B., Connie, T., Ong, T. S., Teoh, A. B. J., & Goh, M. K. O. (2024). Gait-based age group classification with adaptive graph neural network. Engineering Applications of Artificial Intelligence. https://doi.org/10.1016/j.engappai.2024.109081
An, W., Yu, S., Makihara, Y., Wu, X., Xu, C., Yu, Y., Liao, R., & Yagi, Y. (2020). Performance evaluation of model-based gait on multi-view very large population database with pose sequences. IEEE Transactions on Biometrics, Behavior, and Identity Science, 2(4), 421–430. https://doi.org/10.1109/ TBIOM.2020.3008862
Fan, C., Ma, J., Jin, D., Shen, C., & Yu, S. (2024). SkeletonGait: Gait recognition using skeleton maps. Proceedings of the AAAI Conference on Artificial Intelligence, 38(2), 1662–1669. https://doi. org/10.1609/AAAI.V38I2.27933
He, D., Xue, Y., Li, Y., Sun, Z., Xiao, X., & Wang, J. (2023). Multi-scale spatio-temporal network for skeleton-based gait recognition. Integrated ComputerAided Engineering, 30(4), 357–375. https://doi. org/10.3233/ICA-230033
Huang, B., Luo, Y., Xie, J., Pan, J., & Zhou, C. (2025). Attention-aware spatio-temporal learning for multi-view gait-based age estimation and gender classification. IET Computer Vision, 19(1), e12165. https://doi.org/10.1049/cvi2.12165
Kuroda, T., Okamoto, S., & Akiyama, Y. (2025). Walking-age estimator based on gait parameters using kernel regression. Applied Sciences, 15(11), 5825. https://doi.org/10.3390/app15115825

Issue Fiftieth – November 2026

37

AI-Based Age Estimation from Human Gait in Surveillance Systems for Smart Policing Applications

Li, X., Makihara, Y., Xu, C., & Yagi, Y. (2025). GaitAGE: Gait age and gender estimation based on an age- and gender-specific 3D human model. IEEE Transactions on Biometrics, Behavior, and Identity Science, 7(1), 47–60. https://doi.org/10.1109/ TBIOM.2024.3424841
Li, X., Makihara, Y., Xu, C., Yagi, Y., & Ren, M. (2018). Gait-based human age estimation using age group-dependent manifold learning and regression. Multimedia Tools and Applications, 77, 28333–28354. https://doi.org/10.1007/s11042018-6049-7
Sakata, A., Makihara, Y., Takemura, N., Muramatsu, D., & Yagi, Y. (2020). How confident are you in your estimate of a human age? Uncertaintyaware gait-based age estimation by label distribution learning. 2020 IEEE International Joint Conference on Biometrics (IJCB). https://doi.org/10.1109/ IJCB48548.2020.9304914
Sakata, A., Takemura, N., & Yagi, Y. (2019). Gaitbased age estimation using multi-stage convolutional neural network. IPSJ Transactions on Computer Vision and Applications, 11, Article 4. https://doi. org/10.1186/s41074-019-0054-2

Sepas-Moghaddam, A., & Etemad, A. (2023). Deep gait recognition: A survey. IEEE Transactions on PatternAnalysis and Machine Intelligence, 45(1), 264– 284. https://doi.org/10.1109/TPAMI.2022.3151865
Teepe, T., Gilg, J., Herzog, F., Hörmann, S., & Rigoll, G. (2022). Towards a deeper understanding of skeleton-based gait recognition. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops (pp. 1568–1576). https://doi.org/10.1109/CVPRW56347.2022.00163
Wei, S., Liu, W., Wei, F., Wang, C., & Xiong, N. N. (2024). GaitDLF: Global and local fusion for skeleton-based gait recognition in the wild. The Journal of Supercomputing, 80, 17606–17632. https://doi.org/10.1007/s11227-024-06089-7
Yunardi, R. T., Sardjono, T. A., & Mardiyanto, R. (2024). Skeleton-based gait recognition using modified deep convolutional neural networks and long short-term memory for person recognition. IEEE Access, 12, 121131– 121143. https://doi.org/10.1109/ACCESS.2024.3451495
Zhu, H., Zhang, Y., Li, G., Zhang, J., & Shan, H. (2020). Ordinal distribution regression for gait-based age estimation. Science China Information Sciences, 63(2). https://doi.org/10.1007/s11432-019-2733-4

38

Issue Fiftieth – November 2026
