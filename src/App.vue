<template>
  <div class="container">
    <h1>成绩计算器</h1>
    <p>可以计算成绩，更快速的判断自己是否可以拿到多少的字母成绩</p>

    <div v-if="currentScene === 'setup'" class="box setup-box">
      <h2>初始化课程设置</h2>
      <label>选择周期：</label>
      <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
        <div>
          <div style="font-size: 12px; color: #666;">本学期开始</div>
          <input type="date" v-model="semesterStartDate" />
        </div>
        <div>
          <div style="font-size: 12px; color: #666;">本学期结束</div>
          <input type="date" v-model="semesterEndDate" />
        </div>
      </div>

      <label style="margin-top: 12px; display: block;">课程数量(1~7): </label>
      <select v-model.number="courseCount" @change="generateCourses" style="width: 100%; margin-top: 6px;">
        <option v-for="n in 7" :key="n" :value="n">{{ n }}</option>
      </select>

      <div v-for="(name, index) in courseNames" :key="index" class="course-name-row">
        <input type="text" v-model="courseNames[index]" :placeholder="`课程 ${index + 1} 名称`" />
      </div>

      <button class="save-btn" @click="enterCalculator">保存并进入成绩计算器</button>
    </div>

    <div v-if="currentScene === 'calculator'">
      <div class = "box">
        <button @click="currentScene = 'setup'" style="margin-bottom:12px;">修改学年/课程设置</button>
        <h2>每个部分所占的权重</h2>
    <div v-for="(category, index) in categories" :key="category.id" class="category">
      <select v-model="category.name">
        <option disabled value="">选择类别名称</option>
        <option v-for="option in nameOptions" :key="option" :value="option">{{ option }}</option>
        <option value="custom">自定义</option>
      </select>
      <input v-if="category.name === 'custom'" type="text" placeholder="自定义名字" v-model="category.customName" />
      <input type="number" placeholder="权重 (%)" v-model.number="category.weight" @input="recordNumberInput(category.weight)" list="numberHistoryList" />
      <select v-model="category.released" style="width:100%; margin-top:6px;">
        <option :value="true">已出成绩</option>
        <option :value="false">未出成绩</option>
      </select>
    
    <select v-model="category.type" @change="switchType(category)">
          <option value="single">Single</option>
          <option value="repeated">Multiple (e.g. quizzes)</option>
    </select>


    <button @click="removeCategory(category.id)">Remove</button>

    <div v-if="category.type === 'single'">
          <input
            class="inner-input"
            type="number"
            placeholder="得到分数"
            v-model.number="category.earnedPoints"
            @input="recordNumberInput(category.earnedPoints)"
            list="numberHistoryList"
          />

          <input
            class="inner-input"
            type="number"
            placeholder="当前总分"
            v-model.number="category.currentTotalPoints"
            @input="recordNumberInput(category.currentTotalPoints)"
            list="numberHistoryList"
          />
          <p style="font-size: 12px; color: #666; margin-top: 4px;">
            计算: ({{ category.earnedPoints || 0 }} / {{ category.currentTotalPoints || 0 }}) × {{ category.weight || 0 }}% = {{ category.currentTotalPoints ? ((category.earnedPoints || 0) / category.currentTotalPoints * (category.weight || 0)).toFixed(2) : 0 }}%
          </p>
    </div>

    <div v-if="category.type === 'repeated'">

        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
          <label>子项权重分配:</label>
          <select v-model="category.distribution" @change="prepareCustomDistribution(category)">
            <option value="equal">平均分配 (默认)</option>
            <option value="custom">自定义权重</option>
          </select>
        </div>

        <!-- 输入 quiz 数量 -->
        <input
          type="number"
          placeholder="Total number (e.g. 5 quizzes)"
          v-model.number="category.totalItems"
          @input="syncItems(category); recordNumberInput(category.totalItems)"
          list="numberHistoryList"
        />

        <!-- 动态生成 (只显示前 totalItems 个，但保留所有数据) -->
        <div v-for="(item, i) in category.items.slice(0, Number(category.totalItems) || 0)" :key="item.id" style="margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 8px;">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
              <span>Item {{ i + 1 }}</span>
              <input type="text" placeholder="子项名称" v-model="item.name" style="flex:1;" />
              <label>
                <input type="checkbox" v-model="item.released" /> 已出成绩
              </label>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
              <input
                type="number"
                placeholder="总分"
                v-model.number="item.currentTotalPoints"
                @input="recordNumberInput(item.currentTotalPoints)"
                list="numberHistoryList"
              />

              <input
                v-if="item.released"
                type="number"
                placeholder="得分"
                v-model.number="item.earnedPoints"
                @input="recordNumberInput(item.earnedPoints)"
                list="numberHistoryList"
              />

              <input
                v-if="category.distribution === 'custom'"
                type="number"
                min="0"
                step="0.01"
                placeholder="子项权重%"
                v-model.number="item.weight"
                @input="recordNumberInput(item.weight)"
                list="numberHistoryList"
              />
            </div>
        </div>
      </div>
    </div>

    <button v-if="totalWeight < 100" @click="addCategory">Add Category</button>
  </div>

  <!-- 加入判断extracredit的功能 用户可以选择是否有extra credit 如果有则输入extra credit的分数和总分 -->
  <div v-if="Math.abs(totalWeight - 100) < 0.001" class = "box">
    <h2>✨ Extra Credit</h2>
    <p style="margin-bottom: 16px;">Do you have extra credit?</p>
    <div style="display: flex; gap: 12px;">
      <button @click="hasExtraCredit = 'yes'" style="flex: 1; background: linear-gradient(135deg, #0d9488 0%, #0d7d7d 100%);">Yes</button>
      <button @click="hasExtraCredit = 'no'" style="flex: 1; background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%);">No</button>
    </div>
  </div>

  <div v-if="hasExtraCredit === 'yes'" class = "box">
    <h3>Enter Extra Credit Details</h3>
    <label>应用方式：</label>
    <select v-model="extraCreditMode" style="width:100%; margin-top:8px;">
      <option value="global">全科额外加分</option>
      <option value="category">指定类别额外加分</option>
    </select>

    <div v-if="extraCreditMode === 'category'" style="margin-top: 8px;">
      <label>选择类别：</label>
      <select v-model.number="extraCreditCategoryId" style="width:100%; margin-top:8px;">
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name || '未命名类别' }}</option>
      </select>
    </div>

    <label style="margin-top: 8px; display:block;">额外分数类型：</label>
    <select v-model="extraCreditType" style="width:100%; margin-top:8px;">
      <option value="percent">百分比 (例如 10% 的额外加分)</option>
      <option value="points">积分 (例如 1、2、3 分额外加分)</option>
    </select>

    <input
      type="number"
      placeholder="已获额外分数"
      v-model.number="extraCreditValue"
      style="width:100%; margin-top: 10px;"
      @input="recordNumberInput(extraCreditValue)"
      list="numberHistoryList"
    />

    <input
      type="number"
      placeholder="额外分数基准（例如 100 或 5）"
      v-model.number="extraCreditValueMax"
      style="width:100%; margin-top: 8px;"
      @input="recordNumberInput(extraCreditValueMax)"
      list="numberHistoryList"
    />
  </div>

  <div v-if="hasExtraCredit === 'no'" class = "box">
    <p>No extra credit will be included in the calculation.</p>
  </div>

  <p>Total Weight: {{ totalWeight }}%</p>

  <p v-if="totalWeight < 100" style="color: orange;">
    Total weight is less than 100%. Please adjust the weights.
  </p>
  <p v-else-if="totalWeight > 100" style="color: red;">
    Total weight cannot exceed 100%.
  </p>
  <p v-else style="color: green;">
    Total weight is perfect! You can proceed.
  </p>

  <!-- tragrt是用户想要达到的字母成绩 用户输入之后就可以计算出需要达到的分数 -->
  <div class = "box target-box">
    <h2>目标成绩所需得分计算</h2>
    <input type="number" placeholder="目标成绩 (%)" v-model.number="targetGrade" @input="recordNumberInput(targetGrade)" list="numberHistoryList" />
    <div style="margin-top: 12px;">
      <label>目标A分数门槛 (%)：</label>
      <input type="number" style="width: 100%;" v-model.number="targetGradeA" @input="recordNumberInput(targetGradeA)" list="numberHistoryList" />
      <p style="font-size: 14px; color: #444; margin-top: 4px;"> 当前已课成绩：{{ confirmedGrade.toFixed(2) }}%，未出成绩最多可补充：{{ unreleasedPotential.toFixed(2) }}%。</p>
      <p style="font-size: 14px; color: #444; margin-top: 2px;">要达到 A（{{ targetGradeA.toFixed(2) }}%），未出成绩平均需达到：
        <span v-if="neededAverageUnreleased === null">N/A</span>
        <span v-else-if="neededAverageUnreleased === Infinity">无解（需要 >100%）</span>
        <span v-else>{{ neededAverageUnreleased.toFixed(2) }}%</span>
      </p>
    </div>
    <p class="highlight-text">当前已确认成绩（不含额外加分）：{{ confirmedGrade.toFixed(2) }}%</p>
    <p class="highlight-text">当前已确认成绩（含额外加分）：{{ confirmedGradeWithExtra.toFixed(2) }}%</p>
    <p class="highlight-text">最优可达成绩（不含额外加分）：{{ bestPossibleGrade.toFixed(2) }}%</p>
    <p class="highlight-text">最优可达成绩（含额外加分）：{{ bestPossibleGradeWithExtra.toFixed(2) }}%</p>
    <p v-if="(targetGrade !== null && bestPossibleGradeWithExtra < targetGrade) || (targetGradeA !== null && bestPossibleGradeWithExtra < targetGradeA)" style="color: red;">
      没有办法达成了，没关系的 尽力就好！！ 要不要更换一个目标成绩看看？
    </p>

  </div> <!-- target-box -->
  </div> <!-- calculator wrapper -->
  </div> <!-- container -->

  <!-- 数字历史列表 -->
  <datalist id="numberHistoryList">
    <option v-for="num in Array.from(numberHistory).sort((a, b) => Number(a) - Number(b))" :key="num" :value="num" />
  </datalist>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

// 学年和课程设置
const yearOptions = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
const selectedYear = ref(yearOptions[0]);
const semesterStartDate = ref('');
const semesterEndDate = ref('');
const courseCount = ref(3);
const courseNames = ref([]);
const currentScene = ref('setup');
const configStorageKey = 'gradeCalculatorConfig';

const nameOptions = ['Homework', 'Presentation', 'Quiz', 'Midterm', 'Final Exam', 'Final Project', 'Participation', 'Lab', 'Essay', 'Attendance'];

// Define the categories for the grade calculator 意思就是空白界面让用户自己输入
const categories = ref([
  {
    id: 1,
    name: '',
    customName: '',
    weight: null,
    type: 'single',
    distribution: 'equal',

    // single
    earnedPoints: null,
    currentTotalPoints: null,
    released: true,

    // repeated
    totalItems: null,
    items: []
  }
])

const hasExtraCredit = ref('no');
const extraCreditMode = ref('global'); // global or category
const extraCreditType = ref('percent'); // percent or points
const extraCreditCategoryId = ref(null);
const extraCreditValue = ref(0);
const extraCreditValueMax = ref(100);
const targetGrade = ref(null);
const targetGradeA = ref(90);
const numberHistory = ref(new Set()); // 存储历史输入的数字

const totalWeight = computed(() => {
  return categories.value.reduce((sum, category) => sum + (category.weight || 0), 0);
});

function addCategory() {
  categories.value.push({
    id: Date.now(),
    name: '',
    customName: '',
    weight: 0,
    type: 'single',
    distribution: 'equal',
    earnedPoints: null,
    currentTotalPoints: null,
    released: false,
    totalItems: null,
    items: []
  });
}

function removeCategory(id) {
  categories.value = categories.value.filter(category => category.id !== id);
}

function createSegmentedCategory() {
  categories.value.push({
    id: Date.now(),
    name: '',
    customName: '',
    weight: 0,
    type: 'single',
    distribution: 'equal',
    earnedPoints: null,
    currentTotalPoints: null,
    released: false,
    totalItems: null,
    items: []
  });
}

function createRepeatedItem(index = 1) {
  return {
    id: Date.now() + index,
    name: `Item ${index}`,
    released: false,
    earnedPoints: null,
    currentTotalPoints: null,
    weight: 0
  };
}

function initItemWeights(category) {
  if (!Array.isArray(category.items)) return;
  category.items.forEach(item => {
    if (item.weight === null || item.weight === undefined) {
      item.weight = 0;
    }
  });
}

function initCourseNames() {
  const count = Math.max(1, Math.min(7, Number(courseCount.value) || 1));
  courseCount.value = count;
  courseNames.value = Array.from({ length: count }, (_, i) => {
    const value = courseNames.value[i];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
    return '';
  });
}

function generateCourses() {
  initCourseNames();
  saveConfig();
}

function enterCalculator() {
  initCourseNames();

  categories.value = courseNames.value.map((name, i) => ({
    id: Date.now() + i,
    name: (name !== null && name !== undefined && String(name).trim() !== '') ? String(name).trim() : '',
    customName: '',
    weight: 0,
    type: 'single',
    distribution: 'equal',
    earnedPoints: null,
    currentTotalPoints: null,
    released: true,
    totalItems: null,
    items: []
  }));

  currentScene.value = 'calculator';
  saveConfig();
}

function saveConfig() {
  const config = {
    selectedYear: selectedYear.value,
    semesterStartDate: semesterStartDate.value,
    semesterEndDate: semesterEndDate.value,
    courseCount: courseCount.value,
    courseNames: courseNames.value,
    currentScene: currentScene.value,
    categories: categories.value,
    hasExtraCredit: hasExtraCredit.value,
    extraCreditMode: extraCreditMode.value,
    extraCreditType: extraCreditType.value,
    extraCreditCategoryId: extraCreditCategoryId.value,
    extraCreditValue: extraCreditValue.value,
    extraCreditValueMax: extraCreditValueMax.value,
    targetGrade: targetGrade.value,
    targetGradeA: targetGradeA.value,
    numberHistory: Array.from(numberHistory.value),
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(configStorageKey, JSON.stringify(config));
}

function isStaleSemester(config) {
  if (!config.semesterEndDate) return false;

  const end = new Date(config.semesterEndDate);
  if (Number.isNaN(end.getTime())) return false;

  const cleanupDate = new Date(end);
  cleanupDate.setDate(cleanupDate.getDate() + 10);

  return new Date() > cleanupDate;
}

function loadConfig() {
  const stored = localStorage.getItem(configStorageKey);
  if (!stored) return;

  try {
    const config = JSON.parse(stored);

    // 如果本学期已经结束 10 天外，自动删除保存数据并重置
    if (isStaleSemester(config)) {
      localStorage.removeItem(configStorageKey);
      currentScene.value = 'setup';
      return;
    }

    if (config.selectedYear) selectedYear.value = config.selectedYear;
    if (config.semesterStartDate) semesterStartDate.value = config.semesterStartDate;
    if (config.semesterEndDate) semesterEndDate.value = config.semesterEndDate;
    if (config.courseCount) courseCount.value = config.courseCount;
    if (Array.isArray(config.courseNames)) courseNames.value = config.courseNames;
    if (config.currentScene) currentScene.value = config.currentScene;
    if (Array.isArray(config.categories) && config.categories.length) categories.value = config.categories;
    if (typeof config.hasExtraCredit === 'string') hasExtraCredit.value = config.hasExtraCredit;
    if (typeof config.extraCreditMode === 'string') extraCreditMode.value = config.extraCreditMode;
    if (typeof config.extraCreditType === 'string') extraCreditType.value = config.extraCreditType;
    if (typeof config.extraCreditCategoryId === 'number') extraCreditCategoryId.value = config.extraCreditCategoryId;
    if (typeof config.extraCreditValue === 'number') extraCreditValue.value = config.extraCreditValue;
    if (typeof config.extraCreditValueMax === 'number') extraCreditValueMax.value = config.extraCreditValueMax;
    if (typeof config.targetGrade === 'number') targetGrade.value = config.targetGrade;
    if (typeof config.targetGradeA === 'number') targetGradeA.value = config.targetGradeA;
    if (Array.isArray(config.numberHistory)) numberHistory.value = new Set(config.numberHistory);
  } catch {
    localStorage.removeItem(configStorageKey);
  }
}

onMounted(() => {
  loadConfig();
  if (currentScene.value === 'setup') {
    initCourseNames();
  }
  // 自动清理过期存储
  const stored = localStorage.getItem(configStorageKey);
  if (stored) {
    try {
      const config = JSON.parse(stored);
      if (isStaleSemester(config)) {
        localStorage.removeItem(configStorageKey);
        currentScene.value = 'setup';
      }
    } catch {
      localStorage.removeItem(configStorageKey);
    }
  }
});

watch([selectedYear, semesterStartDate, semesterEndDate, courseCount, courseNames, categories, hasExtraCredit, extraCreditMode, extraCreditType, extraCreditCategoryId, extraCreditValue, extraCreditValueMax, targetGrade, targetGradeA], saveConfig, { deep: true });

function syncItems(category) {
  let target = Number(category.totalItems) || 0
  target = Math.max(0, Math.floor(target))

  if (!Array.isArray(category.items)) {
    category.items = []
  }

  // 只在需要时增加新项，不删除多余项
  // 减少数量时，多余项被隐藏但数据保留，再增加时恢复
  while (category.items.length < target) {
    category.items.push(createRepeatedItem(category.items.length + 1))
  }

  // 保证自定义权重可输入
  initItemWeights(category)
}

function prepareCustomDistribution(category) {
  if (category.distribution === 'custom') {
    initItemWeights(category)
  }
}

function switchType(category) {
  if (category.type === 'single') {
    category.totalItems = 0
    category.items = []
  } else if (category.type === 'repeated') {
    category.released = true
    category.earnedPoints = null
    category.currentTotalPoints = null
    syncItems(category)
  }
}

const confirmedGrade = computed(()=> {
  return categories.value.reduce((sum, category) => {
    return sum + getConfirmedContribution(category)
  }, 0)
})

const bestPossibleGrade = computed(() => {
  return categories.value.reduce((sum, category) => {
    return sum + getBestPossibleContribution(category)
  }, 0);
})

const remainingWeight = computed(() => {
  return Math.max(0, 100 - totalWeight.value);
})

const extraCreditContribution = computed(() => {
  if (hasExtraCredit.value !== 'yes') return 0

  const base = normalizeNumber(extraCreditValue.value)
  const max = normalizeNumber(extraCreditValueMax.value)
  if (max <= 0) return 0

  const rate = Math.min(1, Math.max(0, base / max))

  if (extraCreditMode.value === 'global') {
    return extraCreditType.value === 'percent'
      ? rate * 100
      : rate * 100
  }

  // category 模式：将额外贡献归入一个特定 category 权重之内
  const category = categories.value.find(c => c.id === extraCreditCategoryId.value)
  if (!category || !category.weight) return 0

  const catWeight = normalizeNumber(category.weight)
  return rate * catWeight
})

const confirmedGradeWithExtra = computed(() => {
  return confirmedGrade.value + extraCreditContribution.value
})

const bestPossibleGradeWithExtra = computed(() => {
  return bestPossibleGrade.value + extraCreditContribution.value
})

const neededAverageOnRemaining = computed(() => {
  if (targetGrade.value === null) return null

  const remaining = bestPossibleGradeWithExtra.value - confirmedGradeWithExtra.value

  if (remaining <= 0) return null

  const needed = targetGrade.value - confirmedGradeWithExtra.value

  if (needed <= 0) return 0

  return (needed / remaining) * 100
})

const remainingWeightBreakdown = computed(() => {
  const list = []

  categories.value.forEach((cat, idx) => {
    if (cat.type === 'single') {
      if (!cat.released && normalizeNumber(cat.weight) > 0) {
        list.push({ name: cat.name || `分类${idx + 1}`, weight: normalizeNumber(cat.weight) })
      }
    } else if (cat.type === 'repeated') {
      const totalItems = cat.items.length
      if (totalItems === 0) return

      if (cat.distribution === 'equal') {
        cat.items.forEach((item, j) => {
          if (!item.released) {
            list.push({
              name: item.name || `${cat.name || `分类${idx + 1}`} 项目${j + 1}`,
              weight: normalizeNumber(cat.weight) / totalItems
            })
          }
        })
      } else {
        const totalItemWeight = cat.items.reduce((sum, item) => sum + (normalizeNumber(item.weight) || 0), 0)
        if (totalItemWeight <= 0) return

        cat.items.forEach((item, j) => {
          if (!item.released) {
            const itemWeightPortion = (normalizeNumber(item.weight) || 0) / totalItemWeight
            list.push({
              name: item.name || `${cat.name || `分类${idx + 1}`} 项目${j + 1}`,
              weight: itemWeightPortion * normalizeNumber(cat.weight)
            })
          }
        })
      }
    }
  })

  return list
})

const suggestedPlan = computed(() => {
  const remainingItems = remainingWeightBreakdown.value
  if (!remainingItems.length) return '所有项目已发布，无法给出未发布评分建议。'

  const remainingWeight = remainingItems.reduce((sum, i) => sum + i.weight, 0)
  if (remainingWeight <= 0) return '未发布项目总权重为 0。'

  const needed = targetGradeA.value - confirmedGrade.value
  if (needed <= 0) return '已满足 A 目标，无需额外分数。'

  const requiredRate = (needed / remainingWeight) * 100
  if (requiredRate > 100) return '即使未发布项目全部满分也无法保证 A， 建议降低期待。'

  const avgSuggestion = Math.min(100, requiredRate)
  return `建议未发布项目平均至少达到 ${avgSuggestion.toFixed(1)}%，视具体项目略有浮动。` 
})

const unreleasedPotential = computed(() => {
  return Math.max(0, bestPossibleGrade.value - confirmedGrade.value)
})

const neededAverageUnreleased = computed(() => {
  if (targetGradeA.value === null) return null
  const needed = targetGradeA.value - confirmedGrade.value
  const available = unreleasedPotential.value

  if (needed <= 0) return 0
  if (available <= 0) return Infinity

  return Math.min(100, (needed / available) * 100)
})

function normalizeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function recordNumberInput(value) {
  const n = Number(value)
  if (Number.isFinite(n) && n !== 0) {
    numberHistory.value.add(String(n))
  }
}

function getConfirmedContribution(category) {
  if (category.type === 'single') {
    const earned = normalizeNumber(category.earnedPoints)
    const total = normalizeNumber(category.currentTotalPoints)
    const weight = normalizeNumber(category.weight)

    if (!category.released || total <= 0 || weight <= 0) return 0

    return (earned / total) * weight
  }

  if (category.type === 'repeated') {
    if (!category.items.length) return 0

    if (category.distribution === 'equal') {
      let earned = 0
      let total = 0

      category.items.forEach(item => {
        if (item.released && item.currentTotalPoints) {
          earned += item.earnedPoints
          total += item.currentTotalPoints
        }
      })

      if (total === 0) return 0

      return (earned / total) * category.weight
    }

    // custom distribution mode: each item单独设置category内权重
    let contribution = 0
    let totalWeight = 0

    category.items.forEach(item => {
      totalWeight += Number(item.weight) || 0
    })

    if (totalWeight <= 0) return 0

    category.items.forEach(item => {
      if (item.released && item.currentTotalPoints) {
        const itemRatio = (item.earnedPoints || 0) / item.currentTotalPoints
        const itemProp = (Number(item.weight) || 0) / totalWeight
        contribution += itemRatio * itemProp * category.weight
      }
    })

    return contribution
  }

  return 0
}

function getBestPossibleContribution(category) {
  if (category.type === 'single') {
    const earned = normalizeNumber(category.earnedPoints)
    const total = normalizeNumber(category.currentTotalPoints)
    const weight = normalizeNumber(category.weight)

    if (weight <= 0) return 0
    if (!category.released || total <= 0) return weight

    return (earned / total) * weight
  }

  if (category.type === 'repeated') {
    if (!category.items.length) return 0

    if (category.distribution === 'equal') {
      let earned = 0
      let total = 0

      category.items.forEach(item => {
        if (item.released && item.currentTotalPoints) {
          earned += item.earnedPoints
          total += item.currentTotalPoints
        } else if (item.currentTotalPoints) {
          // 未出成绩按满分
          earned += item.currentTotalPoints
          total += item.currentTotalPoints
        }
      })

      if (total === 0) return 0

      return (earned / total) * category.weight
    }

    // custom distribution mode: each item单独设置category内权重
    let contribution = 0
    let totalWeight = 0

    category.items.forEach(item => {
      totalWeight += Number(item.weight) || 0
    })

    if (totalWeight <= 0) return 0

    category.items.forEach(item => {
      const itemRatio = item.released && item.currentTotalPoints
        ? (item.earnedPoints || 0) / item.currentTotalPoints
        : 1
      const itemProp = (Number(item.weight) || 0) / totalWeight
      contribution += itemRatio * itemProp * category.weight
    })

    return contribution
  }

  return 0
}

</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  background: linear-gradient(135deg, #0369a1 0%, #0891b2 50%, #0d9488 100%);
  min-height: 100vh;
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.06) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

h1 {
  text-align: center;
  color: #fff;
  font-weight: 800;
  font-size: 2.5rem;
  margin-bottom: 4px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  letter-spacing: -0.5px;
}

h2 {
  color: #2c3e50;
  margin-bottom: 18px;
  font-weight: 700;
  font-size: 1.35rem;
  letter-spacing: -0.3px;
}

h3 {
  color: #2c3e50;
  font-weight: 700;
  font-size: 1.1rem;
}

input, select, button, p {
  font-family: inherit;
}

input, select {
  font-size: 1rem;
  min-height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

select {
  border: 2px solid #e1e8ed;
  border-radius: 12px;
  padding: 10px 14px;
  background-color: #fff;
  cursor: pointer;
  font-weight: 500;
}

select:hover {
  border-color: #0369a1;
  box-shadow: 0 4px 16px rgba(3, 105, 161, 0.12);
  background: linear-gradient(135deg, #fff 0%, #f0f9ff 100%);
}

select:focus {
  outline: none;
  border-color: #0369a1;
  box-shadow: 0 0 0 4px rgba(3, 105, 161, 0.12);
}

.container {
  max-width: 980px;
  margin: 50px auto;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.container > p:first-of-type {
  text-align: center;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 40px;
  font-size: 1.15rem;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.box {
  background: rgba(255, 255, 255, 0.98);
  padding: 28px;
  border-radius: 20px;
  margin-bottom: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  border-radius: 20px 20px 0 0;
}

.box:hover {
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  transform: translateY(-4px);
}

.setup-box {
  border: 2px solid #0369a1;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.99) 0%, rgba(240, 249, 255, 0.98) 100%);
}

.target-box {
  min-height: 340px;
  padding: 36px;
  border: 3px solid #0369a1;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.99) 0%, rgba(240, 249, 255, 0.99) 100%);
  box-shadow: 0 30px 80px rgba(3, 105, 161, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.target-box::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(3, 105, 161, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.inner-input {
  margin-top: 14px;
  margin-bottom: 8px;
}

.course-name-row {
  margin-top: 12px;
}

.setup-box select,
.setup-box input {
  width: 100%;
  margin-top: 10px;
}

.save-btn {
  margin-top: 28px;
  width: 100%;
  background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%);
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 10px 30px rgba(3, 105, 161, 0.25);
}

.save-btn:hover {
  box-shadow: 0 15px 40px rgba(3, 105, 161, 0.35);
}

.highlight-text {
  font-size: 1.12rem;
  font-weight: 700;
  color: #0369a1;
  background: linear-gradient(135deg, rgba(3, 105, 161, 0.08) 0%, rgba(8, 145, 178, 0.06) 100%);
  border-left: 6px solid #0369a1;
  padding: 14px 18px;
  margin: 12px 0;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 3px rgba(3, 105, 161, 0.08);
}

.highlight-text:hover {
  background: linear-gradient(135deg, rgba(3, 105, 161, 0.12) 0%, rgba(8, 145, 178, 0.1) 100%);
  transform: translateX(4px);
  box-shadow: inset 0 1px 3px rgba(3, 105, 161, 0.12), 0 4px 12px rgba(3, 105, 161, 0.08);
}

.category {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 14px;
  margin-bottom: 18px;
  align-items: center;
  background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
  padding: 18px;
  border-radius: 14px;
  border: 2px solid #cffafe;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(3, 105, 161, 0.05);
}

.category:hover {
  border-color: #0369a1;
  background: linear-gradient(135deg, #e0f2fe 0%, #ccfbf1 100%);
  box-shadow: 0 8px 24px rgba(3, 105, 161, 0.1);
  transform: translateY(-2px);
}

input {
  width: 100%;
  min-width: 0;
  padding: 13px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fff;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

input:hover {
  border-color: #cffafe;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02), 0 2px 8px rgba(3, 105, 161, 0.06);
}

input:focus {
  outline: none;
  border-color: #0369a1;
  box-shadow: 0 0 0 4px rgba(3, 105, 161, 0.1), inset 0 2px 4px rgba(3, 105, 161, 0.04);
}

input::placeholder {
  color: #a8b8c8;
}

button {
  padding: 13px 22px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%);
  color: white;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 6px 20px rgba(3, 105, 161, 0.2);
  letter-spacing: 0.3px;
  position: relative;
  overflow: hidden;
}

button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  transition: left 0.3s ease;
}

button:hover {
  background: linear-gradient(135deg, #0891b2 0%, #0d9488 100%);
  box-shadow: 0 10px 30px rgba(3, 105, 161, 0.28);
  transform: translateY(-3px);
}

button:hover::before {
  left: 100%;
}

button:active {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(3, 105, 161, 0.2);
}

label {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 10px;
  display: block;
  font-size: 0.95rem;
  letter-spacing: 0.2px;
}

p {
  color: #4a5f7f;
  line-height: 1.7;
  margin: 10px 0;
}

/* Total Weight 提示 */
.box > p {
  margin: 14px 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.box > p[style*="orange"] {
  background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
  color: #664d03;
  border-left: 5px solid #ffc107;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(255, 193, 7, 0.1);
}

.box > p[style*="red"] {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #72235f;
  border-left: 5px solid #dc3545;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(220, 53, 69, 0.1);
}

.box > p[style*="green"] {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #0c5460;
  border-left: 5px solid #28a745;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(40, 167, 69, 0.1);
}

/* 中等屏幕 */
@media (max-width: 1000px) {
  .category {
    grid-template-columns: 1fr 1fr;
  }

  .category button {
    width: 100%;
  }

  h1 {
    font-size: 2rem;
  }

  .container {
    padding: 16px;
  }
}

/* 小屏幕 */
@media (max-width: 600px) {
  .container {
    padding: 14px;
    margin: 30px auto;
  }

  .box {
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 16px;
  }

  .target-box {
    padding: 24px;
    min-height: 300px;
  }

  .category {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 14px;
  }

  .category input,
  .category button {
    width: 100%;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 8px;
  }

  h2 {
    font-size: 1.15rem;
    margin-bottom: 14px;
  }

  .container > p:first-of-type {
    font-size: 1rem;
    margin-bottom: 28px;
  }

  button {
    padding: 12px 18px;
    font-size: 0.95rem;
  }
}
</style>