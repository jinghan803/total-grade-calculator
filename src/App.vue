<template>
  <div class="container">
    <div class="save-status-badge" :class="`save-status-${saveStatus}`">
      <span v-if="saveStatus === 'saving'">保存中…</span>
      <span v-else-if="saveStatus === 'saved'">已保存</span>
      <span v-else>保存失败</span>
      <small v-if="lastSavedAt">{{ lastSavedAt }}</small>
    </div>

    <h1>成绩计算器</h1>
    <p>可以计算成绩，更快速的判断自己是否可以拿到多少的字母成绩</p>

    <div class="box instruction-box" style="background: #f9f9f9; border: 1px solid #ddd; padding: 14px; margin-bottom: 16px;">
      <h2>使用说明</h2>
      <ol style="padding-left: 18px; margin: 0;">
        <li>上面“初始化课程设置”里，选学期时间、课程数量和课程名称，点“保存并进入成绩计算器”。</li>
        <li>在“每个部分权重”里，点“Add Category”添加评估项（作业、测验、期中、期末等）。</li>
        <li>把每个部分占整个课程分数的百分比填好，保证总和等于100%，有错误会有红字提示。</li>
        <li>填写已出成绩的得分/总分（未出成绩可以留空）。</li>
        <li>设置目标分数，例如想拿A就填90，系统会自动算出你最少需要未出成绩平均多少分。</li>
        <li>如果有额外加分，选择“有 extra credit”，填好方式和分数。</li>
      </ol>
    </div>

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
      <div class="box">
        <h2>📅 学期进度条</h2>
        <p v-if="semesterProgressPercent === null" style="font-size: 13px; color: #666;">请先在“初始化课程设置”填写学期开始和结束日期。</p>
        <template v-else>
          <div style="height: 14px; background: #e5e7eb; border-radius: 999px; overflow: hidden;">
            <div :style="{ width: `${semesterProgressPercent.toFixed(1)}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #14b8a6)' }"></div>
          </div>
          <p style="margin-top: 8px; font-size: 13px; color: #374151;">学期进度：{{ semesterProgressPercent.toFixed(1) }}% ｜当前已确认成绩：{{ confirmedGradeWithExtra.toFixed(2) }}%</p>
          <p style="margin-top: 4px; font-size: 12px; color: #6b7280;">{{ semesterProgressHint }}</p>
        </template>
      </div>

      <div class = "box">
        <button @click="currentScene = 'setup'" style="margin-bottom:12px;">修改学年/课程设置</button>
        <h2>每个部分所占的权重</h2>
    <div v-for="(category, index) in categories" :key="category.id" class="category">
      <div>
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">📚 Category Name:</label>
        <select v-model="category.name">
          <option disabled value="">选择类别名称</option>
          <option v-for="option in nameOptions" :key="option" :value="option">{{ option }}</option>
          <option value="custom">自定义</option>
        </select>
        <input v-if="category.name === 'custom'" type="text" placeholder="自定义名字" v-model="category.customName" style="margin-top: 4px;" />
      </div>

      <div>
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">⚖️ Weight (%):</label>
        <input type="number" placeholder="e.g., 25" v-model.number="category.weight" @input="recordNumberInput(category.weight)" list="numberHistoryList" />
        <p style="font-size: 10px; color: #999; margin-top: 2px;">这门课占总成绩的百分比</p>
        <p style="font-size: 10px; background: #f0f9ff; padding: 6px; border-radius: 4px; color: #666; margin-top: 4px;">例：权重25% → 这门课的成绩占最终成绩的1/4</p>
      </div>

      <div>
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">✅ Status:</label>
        <select v-model="category.released">
          <option :value="true">有成绩</option>
          <option :value="false">没有成绩</option>
        </select>
      </div>
    
      <div>
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">📊 Type:</label>
        <select v-model="category.type" @change="switchType(category)">
          <option value="single">Single</option>
          <option value="repeated">Multiple (e.g. quizzes)</option>
        </select>
      </div>

      <button @click="removeCategory(category.id)" title="Remove this category" style="padding: 8px 12px;">✕</button>

    <div v-if="category.type === 'single'" class="category-details">
          <div style="margin-bottom: 12px;">
            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">📝 Your Score:</label>
            <input
              class="inner-input"
              type="number"
              placeholder="e.g., 85"
              v-model.number="category.earnedPoints"
              @input="recordNumberInput(category.earnedPoints)"
              list="numberHistoryList"
            />
            <p style="font-size: 10px; color: #999; margin-top: 2px;">你在这个部分拿到的实际得分</p>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">🎯 Total Points:</label>
            <input
              class="inner-input"
              type="number"
              placeholder="e.g., 100"
              v-model.number="category.currentTotalPoints"
              @input="recordNumberInput(category.currentTotalPoints)"
              list="numberHistoryList"
            />
            <p style="font-size: 10px; color: #999; margin-top: 2px;">这个部分的总分</p>
          </div>
          <p style="font-size: 12px; color: #666; margin-top: 4px; padding: 8px; background: #f0f9ff; border-radius: 6px;">
            ✓ Your percentage: ({{ category.earnedPoints || 0 }} / {{ category.currentTotalPoints || 0 }}) × {{ category.weight || 0 }}% = {{ category.currentTotalPoints ? ((category.earnedPoints || 0) / category.currentTotalPoints * (category.weight || 0)).toFixed(2) : 0 }}%
          </p>
          <p style="font-size: 10px; background: #fef3c7; padding: 6px; border-radius: 4px; color: #666; margin-top: 6px;">例：拿到85/100，权重25% → 对总成绩贡献 (85/100)×25% = 21.25%</p>
    </div>

    <div v-if="category.type === 'repeated'" class="category-details">

        <div class="repeated-rule-row">
          <label style="font-size: 12px; color: #666;">📦 Distribution:</label>
          <select v-model="category.distribution" @change="prepareCustomDistribution(category)">
            <option value="equal">平均分配 (默认)</option>
            <option value="custom">自定义权重</option>
          </select>
        </div>

        <!-- 输入 quiz 数量 -->
        <div style="margin-top: 8px; margin-bottom: 8px;">
          <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">🔢 How many items? (e.g., 5 quizzes)</label>
          <input
            type="number"
            placeholder="e.g., 5"
            v-model.number="category.totalItems"
            @input="syncItems(category); recordNumberInput(category.totalItems)"
            list="numberHistoryList"
          />
          <p style="font-size: 10px; background: #f0f9ff; padding: 6px; border-radius: 4px; color: #666; margin-top: 4px;">例：有5个小考，就输入5。系统会自动计算这5个讨论的平均分</p>
        </div>

        <!-- 动态生成 (只显示前 totalItems 个，但保留所有数据) -->
        <div v-for="(item, i) in category.items.slice(0, Number(category.totalItems) || 0)" :key="item.id" class="repeated-item">
            <div class="repeated-item-header">
              <span style="font-weight: bold;">Item {{ i + 1 }}</span>
              <input type="text" placeholder="Name (optional)" v-model="item.name" class="item-name-input" />
              <label>
                <input type="checkbox" v-model="item.released" /> ✅
              </label>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
              <div>
                <label style="font-size: 11px; color: #666;">Total:</label>
                <input
                  type="number"
                  placeholder="100"
                  v-model.number="item.currentTotalPoints"
                  @input="recordNumberInput(item.currentTotalPoints)"
                  list="numberHistoryList"
                />
                <p style="font-size: 9px; color: #999; margin-top: 2px;">满分</p>
              </div>

              <div>
                <label style="font-size: 11px; color: #666;">Score:</label>
                <input
                  v-if="item.released"
                  type="number"
                  placeholder="85"
                  v-model.number="item.earnedPoints"
                  @input="recordNumberInput(item.earnedPoints)"
                  list="numberHistoryList"
                />
                <p style="font-size: 9px; color: #999; margin-top: 2px;">得数</p>
              </div>

              <div>
                <label style="font-size: 11px; color: #666;">Weight%:</label>
                <input
                  v-if="category.distribution === 'custom'"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50"
                  v-model.number="item.weight"
                  @input="recordNumberInput(item.weight)"
                  list="numberHistoryList"
                />
                <p style="font-size: 9px; color: #999; margin-top: 2px;">权重</p>
              </div>
            </div>
            <p v-if="item.released && item.currentTotalPoints" style="font-size: 9px; background: #f0f9ff; padding: 4px; border-radius: 3px; color: #666; margin-top: 4px; text-align: center;">
              这个item: {{ ((item.earnedPoints || 0) / item.currentTotalPoints * 100).toFixed(1) }}%
            </p>
        </div>
      </div>
    </div>

    <button v-if="totalWeight < 100" @click="addCategory">Add Category</button>
  </div>

  <!-- 加入判断extracredit的功能 用户可以选择是否有extra credit 如果有则输入extra credit的分数和总分 -->
  <div v-if="Math.abs(totalWeight - 100) < 0.001" class = "box">
    <h2>✨ Extra Credit (额外加分)</h2>
    <p style="margin-bottom: 16px; font-size: 14px; color: #555;">Do you have any extra credit? 你有额外加分吗?</p>
    <div style="display: flex; gap: 12px;">
      <button @click="hasExtraCredit = 'yes'" style="flex: 1; background: linear-gradient(135deg, #0d9488 0%, #0d7d7d 100%); color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer;">✓ Yes (有)</button>
      <button @click="hasExtraCredit = 'no'" style="flex: 1; background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%); color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer;">✕ No (没有)</button>
    </div>
  </div>

  <div v-if="hasExtraCredit === 'yes'" class = "box">
    <h3>📝 Extra Credit Details</h3>
    
    <div style="margin-bottom: 16px; padding: 10px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #0369a1;">
      <p style="margin: 0; font-size: 13px; color: #333;">
        💡 <strong>How it works:</strong> If you earned some extra credit points, fill in below.
      </p>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #666;">
        「选择应用范围 → 选择类型 → 输入已获得和满分」
      </p>
    </div>

    <div style="margin-bottom: 12px;">
      <label style="font-size: 12px; color: #666; display: block; margin-bottom: 6px;">📍 Apply to:</label>
      <select v-model="extraCreditMode" style="width:100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
        <option value="global">All classes (所有科目加分)</option>
        <option value="category">One class only (单个科目加分)</option>
      </select>
    </div>

    <div v-if="extraCreditMode === 'category'" style="margin-bottom: 12px;">
      <label style="font-size: 12px; color: #666; display: block; margin-bottom: 6px;">🎯 Which class?</label>
      <select v-model.number="extraCreditCategoryId" style="width:100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name || '未命名类别' }}</option>
      </select>
    </div>

    <div style="margin-bottom: 12px;">
      <label style="font-size: 12px; color: #666; display: block; margin-bottom: 6px;">⚙️ Credit type:</label>
      <select v-model="extraCreditType" style="width:100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
        <option value="percent">Percentage (百分比加分, e.g., +2%)</option>
        <option value="points">Points (积分加分, e.g., +8 points out of 10)</option>
      </select>
      <p style="font-size: 11px; color: #999; margin-top: 4px;">
        <strong>百分比:</strong> 直接加到最终成绩 | <strong>积分:</strong> 加到当前分数里再算百分比
      </p>
    </div>

    <div v-if="extraCreditType === 'percent'" style="margin-bottom: 12px;">
      <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">➕ Extra credit (%):</label>
      <input
        type="number"
        placeholder="e.g., 2"
        v-model.number="extraCreditValue"
        style="width:100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;"
        @input="recordNumberInput(extraCreditValue)"
        list="numberHistoryList"
      />
      <p style="font-size: 11px; color: #999; margin-top: 4px;">这个百分比会直接加到你的最终成绩上</p>
      
      <div style="margin-top: 10px; padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-size: 11px; color: #333; font-weight: bold;">📝 例子：</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #555;">
          你的当前成绩是75%，输入2 → 最终成绩 = 75% + 2% = <span style="font-weight: bold; color: #d97706;">77%</span>
        </p>
      </div>
    </div>

    <div v-if="extraCreditType === 'points'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
      <div>
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">📊 你拿到:</label>
        <input
          type="number"
          placeholder="e.g., 8"
          v-model.number="extraCreditValue"
          style="width:100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;"
          @input="recordNumberInput(extraCreditValue)"
          list="numberHistoryList"
        />
      </div>

      <div>
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">📈 总分是:</label>
        <input
          type="number"
          placeholder="e.g., 10"
          v-model.number="extraCreditValueMax"
          style="width:100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;"
          @input="recordNumberInput(extraCreditValueMax)"
          list="numberHistoryList"
        />
      </div>
    </div>

    <div v-if="extraCreditType === 'points'" style="padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 11px; color: #333; font-weight: bold;">📝 例子：</p>
      <p style="margin: 6px 0 0 0; font-size: 11px; color: #555;">
        你现在是31/40，额外加分8 → 最终 = <span style="font-weight: bold; color: #d97706;">(31+8)/40 = 39/40 = 97.5%</span>
      </p>
    </div>
  </div>

  <div v-if="hasExtraCredit === 'no'" class = "box">
    <p style="color: #666;">ℹ️ No extra credit will be included in the calculation.</p>
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

  <div class="box">
    <h2>🩺 权重健康检查</h2>
    <p v-if="healthCheckIssues.length === 0" style="color: #166534; font-size: 13px;">✅ 当前没有发现明显配置问题。</p>
    <ul v-else style="margin: 0; padding-left: 18px; color: #991b1b; font-size: 13px;">
      <li v-for="(issue, idx) in healthCheckIssues" :key="`issue-${idx}`" style="margin-bottom: 6px;">{{ issue }}</li>
    </ul>
  </div>

  <div class="box">
    <h2>📊 部分优先级建议</h2>
    <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">按“每提高 1 分（1%）对总评带来的提升”排序，越靠前越值得优先投入。</p>
    <p v-if="prioritySuggestions.length === 0" style="color: #6b7280; font-size: 13px;">暂无未出成绩的课程可排序。</p>
    <ol v-else style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151;">
      <li v-for="item in prioritySuggestions" :key="item.id" style="margin-bottom: 6px;">
        {{ item.name }}：每提升 1% 约带来 +{{ item.gainPerOnePercent.toFixed(2) }}% 总评（权重 {{ item.weight.toFixed(2) }}%）
      </li>
    </ol>
  </div>

  <div class="box">
    <h2>🎚️ 各个部分模拟器</h2>
    <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">可单独模拟每个部分：single 直接模拟；repeated 可模拟整体或某一个小 quiz。</p>

    <div v-if="whatIfTargetOptions.length > 0">
      <label style="font-size: 12px; color: #4b5563; display: block; margin-bottom: 6px;">选择要模拟的部分：</label>
      <select v-model="whatIfTargetKey" style="width: 100%; margin-bottom: 8px;">
        <option v-for="option in whatIfTargetOptions" :key="option.key" :value="option.key">{{ option.name }}</option>
      </select>

      <label style="font-size: 12px; color: #4b5563; display: block; margin-bottom: 6px;">假设该部分得分率：{{ whatIfScore.toFixed(0) }}%</label>
      <input type="range" min="0" max="100" step="1" v-model.number="whatIfScore" style="width: 100%;" />
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button @click="setWhatIfScore(85)" style="flex: 1;">85%</button>
        <button @click="setWhatIfScore(90)" style="flex: 1;">90%</button>
        <button @click="setWhatIfScore(95)" style="flex: 1;">95%</button>
      </div>
      <button @click="applyWhatIfScoreToInputs" style="width: 100%; margin-top: 8px; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);">
        自动填入这个部分
      </button>
      <p style="margin-top: 10px; font-size: 13px; color: #0f766e;">模拟后总评（含额外加分）：{{ whatIfProjectedGrade.toFixed(2) }}%</p>
      <p style="margin-top: 4px; font-size: 12px; color: #6b7280;">相较当前：{{ whatIfDelta >= 0 ? '+' : '' }}{{ whatIfDelta.toFixed(2) }}%</p>
      <p v-if="whatIfApplyNotice" style="margin-top: 6px; font-size: 12px; color: #0f766e;">{{ whatIfApplyNotice }}</p>
    </div>
    <p v-else style="font-size: 13px; color: #6b7280;">暂无可模拟的部分，请先添加并设置部分。</p>
  </div>

  <!-- tragrt是用户想要达到的字母成绩 用户输入之后就可以计算出需要达到的分数 -->
  <div class = "box target-box">
    <h2>🎯 Target Grade Calculation (目标成绩计算)</h2>
    
    <div style="margin-bottom: 16px;">
      <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">📌 Target grade (%):</label>
      <input type="number" placeholder="e.g., 85" v-model.number="targetGrade" @input="recordNumberInput(targetGrade)" list="numberHistoryList" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc; width: 100%;" />
      <p style="font-size: 10px; background: #f0f9ff; padding: 6px; border-radius: 4px; color: #666; margin-top: 4px;">例：输入85表示想要达到85%的成绩</p>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">🅰️ Target A grade (%):</label>
      <input type="number" placeholder="e.g., 90" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc;" v-model.number="targetGradeA" @input="recordNumberInput(targetGradeA)" list="numberHistoryList" />
      <p style="font-size: 10px; background: #f0f9ff; padding: 6px; border-radius: 4px; color: #666; margin-top: 4px;">例：A通常是90-100，输入你目标成绩的下限</p>
      <p style="font-size: 13px; color: #444; margin-top: 8px; padding: 8px; background: #f0f9ff; border-radius: 6px;">
        ✓ 当前已确认成绩：{{ confirmedGrade.toFixed(2) }}% ｜未出成绩最多可补充：+{{ unreleasedPotential.toFixed(2) }}%
      </p>
      <p style="font-size: 13px; color: #444; margin-top: 6px; padding: 8px; background: #fef3c7; border-radius: 6px;">
        📊 要达到 A（{{ targetGradeA.toFixed(2) }}%），未出成绩平均需要：
        <span v-if="neededAverageUnreleased === null" style="font-weight: bold; color: #d97706;"> N/A</span>
        <span v-else-if="neededAverageUnreleased === Infinity" style="font-weight: bold; color: #dc2626;"> 无法达到（需要 &gt;100%）</span>
        <span v-else style="font-weight: bold; color: #0d7d7d;"> {{ neededAverageUnreleased.toFixed(2) }}%</span>
      </p>
    </div>

    <div style="margin-top: 18px; padding: 12px; background: linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(13, 125, 125, 0.08) 100%); border-radius: 8px;">
      <p style="font-size: 12px; color: #333; font-weight: bold; margin-bottom: 10px;">📊 成绩详解：</p>
      <div style="margin-bottom: 12px; padding: 10px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #2563eb;">
        <p style="margin: 0; font-size: 11px; color: #1e3a8a; font-weight: bold;">先看这三个概念：</p>
        <p style="margin: 6px 0 0 0; font-size: 10px; color: #475569;">1. 当前已确认成绩 = 现在已经出分的部分，按权重算出来你已经稳拿到的成绩。</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569;">2. 未出成绩最多可补充 = 还没出分的部分，如果后面全部拿满分，最多还能再增加多少个百分点。</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569;">3. 最优可达成绩 = 当前已确认成绩 + 未出成绩最多可补充，也就是你理论上最高能到的分数。</p>
      </div>
      
      <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #0d9488;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0d9488;">📍 当前已确认成绩 (不含额外加分): {{ confirmedGrade.toFixed(2) }}%</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #666;">= 只看“已经出成绩”的部分，按权重算出来你现在已经确定拿到的成绩</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #999;">例：midterm 已出、homework 已出、lab 只算已完成那部分；其他还没出的部分先不算进来。</p>
      </div>

      <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #0d9488;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0d9488;">⭐ 当前已确认成绩 (含额外加分): {{ confirmedGradeWithExtra.toFixed(2) }}%</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #666;">= 当前已确认成绩 + 你已经填入的 extra credit</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #999;">例：如果有2%的额外加分，84.60% + 2% = 86.60%</p>
      </div>

      <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #f59e0b;">📈 最优可达成绩 (不含额外加分): {{ bestPossibleGrade.toFixed(2) }}%</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #666;">= 假设现在还没出的那些部分，后面你全部拿满分时，最终最高可以到多少</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #999;">例：当前已确认是 84.60%，而未出部分最多还能补 10%，那最优可达成绩就是 94.60%。</p>
      </div>

      <div style="padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #059669;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #059669;">🏆 最优可达成绩 (含额外加分): {{ bestPossibleGradeWithExtra.toFixed(2) }}%</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #666;">= 最优可达成绩 + extra credit，也就是把“未出全满分”和“额外加分”都一起算进去的最好情况</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #999;">例：如果最优可达是 94.60%，再加 2% extra，那最好情况就是 96.60%。</p>
      </div>

      <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #7c3aed;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #6d28d9;">🎓 成绩等级映射</p>
        <div style="margin-top: 8px; padding: 8px; background: #f8f5ff; border-radius: 6px;">
          <label style="font-size: 11px; color: #5b21b6; display: block; margin-bottom: 6px;">学校预设等级标准：</label>
          <select v-model="gradeScalePreset" style="width: 100%; min-height: 36px; padding: 6px 10px; border-radius: 8px; border: 1px solid #c4b5fd;">
            <option value="us-standard">US Standard（A 93+ / A- 90+）</option>
            <option value="china-90">90制（A 90+ / B 80+ / C 70+）</option>
            <option value="gpa-4">4.0 GPA 映射（百分制近似）</option>
            <option value="custom">自定义</option>
          </select>
          <div v-if="gradeScalePreset === 'custom'" style="margin-top: 8px;">
            <label style="font-size: 11px; color: #5b21b6; display: block; margin-bottom: 4px;">请输入 A- 起始分数：</label>
            <input
              type="number"
              min="60"
              max="99"
              step="0.1"
              placeholder="例如 89.5"
              v-model.number="customAMinusThreshold"
              @input="recordNumberInput(customAMinusThreshold)"
              list="numberHistoryList"
              style="width: 100%; min-height: 36px; padding: 6px 10px; border-radius: 8px; border: 1px solid #c4b5fd;"
            />
          </div>
        </div>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #666;">当前成绩等级（含额外加分）：<strong>{{ gradeLabel(confirmedGradeWithExtra) }}</strong></p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">最优可达等级（含额外加分）：<strong>{{ gradeLabel(bestPossibleGradeWithExtra) }}</strong></p>
        <p style="margin: 6px 0 0 0; font-size: 10px; color: #999;">映射标准：{{ gradeScaleText }}</p>
      </div>

      <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #ea580c;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #c2410c;">🧭 结果解释模式</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #666;">{{ resultExplanation }}</p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #666;">{{ suggestedPlan }}</p>
      </div>
    </div>

    <p v-if="(targetGrade !== null && bestPossibleGradeWithExtra < targetGrade) || (targetGradeA !== null && bestPossibleGradeWithExtra < targetGradeA)" style="color: #dc2626; margin-top: 12px; padding: 10px; background: #fee2e2; border-radius: 6px; border-left: 4px solid #dc2626;">
      ⚠️ Goal cannot be reached with current situation. 加油! 😊
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

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
const gradeScalePreset = ref('us-standard'); // us-standard | china-90 | gpa-4 | custom
const customAMinusThreshold = ref(90);
const whatIfScore = ref(90);
const whatIfTargetKey = ref('');
const whatIfApplyNotice = ref('');
const numberHistory = ref(new Set()); // 存储历史输入的数字
const saveStatus = ref('saved'); // saving | saved | error
const lastSavedAt = ref('');
let saveStatusTimer = null;

const totalWeight = computed(() => {
  return categories.value.reduce((sum, category) => sum + (category.weight || 0), 0);
});

function addCategory() {
  categories.value.push({
    id: Date.now(),
    name: '',
    customName: '',
    weight: null,
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
    gradeScalePreset: gradeScalePreset.value,
    customAMinusThreshold: customAMinusThreshold.value,
    numberHistory: Array.from(numberHistory.value),
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(configStorageKey, JSON.stringify(config));
    saveStatus.value = 'saved';
    lastSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } catch {
    saveStatus.value = 'error';
  }
}

function triggerAutoSave() {
  saveStatus.value = 'saving';

  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer);
  }

  saveStatusTimer = setTimeout(() => {
    saveConfig();
    saveStatusTimer = null;
  }, 220);
}

function flushSaveNow() {
  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer);
    saveStatusTimer = null;
  }
  saveConfig();
}

function handlePageHiddenSave() {
  if (document.visibilityState === 'hidden') {
    flushSaveNow();
  }
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
    if (typeof config.gradeScalePreset === 'string') gradeScalePreset.value = config.gradeScalePreset;
    if (!config.gradeScalePreset && typeof config.aMinusStandardMode === 'string') {
      gradeScalePreset.value = config.aMinusStandardMode === 'custom' ? 'custom' : 'us-standard';
    }
    if (typeof config.customAMinusThreshold === 'number') customAMinusThreshold.value = config.customAMinusThreshold;
    if (Array.isArray(config.numberHistory)) numberHistory.value = new Set(config.numberHistory);
  } catch {
    localStorage.removeItem(configStorageKey);
  }
}

onMounted(() => {
  loadConfig();
  lastSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  if (currentScene.value === 'setup') {
    initCourseNames();
  }

  const applyHintsToInputs = () => {
    document.querySelectorAll('input, select').forEach((el) => {
      const placeholder = el.getAttribute('placeholder');
      const title = el.getAttribute('title');
      const hint = placeholder || el.getAttribute('aria-label') || '请填写内容';
      if (!title) {
        el.setAttribute('title', hint);
      }
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', hint);
      }
    });
  };

  applyHintsToInputs();
  const observer = new MutationObserver(applyHintsToInputs);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('beforeunload', flushSaveNow);
  window.addEventListener('pagehide', flushSaveNow);
  document.addEventListener('visibilitychange', handlePageHiddenSave);

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

  onUnmounted(() => {
    if (saveStatusTimer) {
      clearTimeout(saveStatusTimer);
    }
    window.removeEventListener('beforeunload', flushSaveNow);
    window.removeEventListener('pagehide', flushSaveNow);
    document.removeEventListener('visibilitychange', handlePageHiddenSave);
    observer.disconnect();
  });
});

watch([selectedYear, semesterStartDate, semesterEndDate, courseCount, courseNames, categories, hasExtraCredit, extraCreditMode, extraCreditType, extraCreditCategoryId, extraCreditValue, extraCreditValueMax, targetGrade, targetGradeA, gradeScalePreset, customAMinusThreshold], triggerAutoSave, { deep: true });

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

    if (!category.totalItems || Number(category.totalItems) <= 0) {
      category.totalItems = 1
    }
    syncItems(category)
  }
}

function displayCategoryName(category, index = 0) {
  if (!category) return `分类${index + 1}`
  if (category.name === 'custom') {
    return category.customName?.trim() || `分类${index + 1}`
  }
  return category.name || `分类${index + 1}`
}

function hasUnreleasedWork(category) {
  if (!category) return false
  if (category.type === 'single') return !category.released
  if (category.type === 'repeated') {
    return Array.isArray(category.items) && category.items.some(item => !item.released)
  }
  return false
}

const semesterProgressPercent = computed(() => {
  if (!semesterStartDate.value || !semesterEndDate.value) return null

  const start = new Date(semesterStartDate.value)
  const end = new Date(semesterEndDate.value)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null

  const now = new Date()
  if (now <= start) return 0
  if (now >= end) return 100

  return ((now - start) / (end - start)) * 100
})

const semesterProgressHint = computed(() => {
  if (semesterProgressPercent.value === null) return '请设置学期日期后查看进度。'

  const progress = semesterProgressPercent.value
  const current = confirmedGradeWithExtra.value
  if (current >= progress) {
    return `当前成绩（${current.toFixed(2)}%）不低于学期进度（${progress.toFixed(1)}%），节奏良好。`
  }

  return `当前成绩（${current.toFixed(2)}%）低于学期进度（${progress.toFixed(1)}%），建议优先补高权重未出项目。`
})

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

  // 百分比模式：You earned 就是百分比本身
  if (extraCreditType.value === 'percent') {
    const percentValue = normalizeNumber(extraCreditValue.value)
    
    if (extraCreditMode.value === 'global') {
      return percentValue  // 直接加到全部成绩
    }
    
    // 如果是 category 模式，加到指定 category 的权重内
    const category = categories.value.find(c => c.id === extraCreditCategoryId.value)
    if (!category || !category.weight) return 0
    const catWeight = normalizeNumber(category.weight)
    return (percentValue / 100) * catWeight
  }

  // 积分模式：You earned / Out of 计算比例
  const earned = normalizeNumber(extraCreditValue.value)
  const total = normalizeNumber(extraCreditValueMax.value)
  if (total <= 0) return 0

  const pointRate = earned / total  // 比如 8/10 = 0.8

  if (extraCreditMode.value === 'global') {
    return pointRate * 100  // 转换成百分比加分（80%）
  }

  // category 模式：将这个比例加到指定 category 的权重内
  const category = categories.value.find(c => c.id === extraCreditCategoryId.value)
  if (!category || !category.weight) return 0
  const catWeight = normalizeNumber(category.weight)
  return pointRate * catWeight
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

function setWhatIfScore(score) {
  whatIfScore.value = Math.max(0, Math.min(100, Number(score) || 0))
}

function getVisibleItems(category) {
  if (!Array.isArray(category.items)) return []
  const totalItems = Math.max(0, Math.floor(Number(category.totalItems) || 0))
  if (totalItems > 0) return category.items.slice(0, totalItems)
  return category.items
}

const whatIfTargetOptions = computed(() => {
  const options = []

  categories.value.forEach((category, index) => {
    const weight = normalizeNumber(category.weight)
    if (weight <= 0) return

    const categoryName = displayCategoryName(category, index)

    if (category.type === 'single') {
      options.push({
        key: `single:${category.id}`,
        kind: 'single',
        categoryId: category.id,
        name: `${categoryName}（single）`
      })
      return
    }

    if (category.type === 'repeated') {
      options.push({
        key: `repeated:${category.id}`,
        kind: 'repeated',
        categoryId: category.id,
        name: `${categoryName}（repeated整体）`
      })

      getVisibleItems(category).forEach((item, itemIndex) => {
        options.push({
          key: `item:${category.id}:${item.id}`,
          kind: 'item',
          categoryId: category.id,
          itemId: item.id,
          name: `${categoryName} - ${item.name || `小测${itemIndex + 1}`}`
        })
      })
    }
  })

  return options
})

const selectedWhatIfTarget = computed(() => {
  return whatIfTargetOptions.value.find(option => option.key === whatIfTargetKey.value) || null
})

watch(whatIfTargetOptions, (options) => {
  if (!options.length) {
    whatIfTargetKey.value = ''
    return
  }

  const exists = options.some(option => option.key === whatIfTargetKey.value)
  if (!exists) {
    whatIfTargetKey.value = options[0].key
  }
}, { immediate: true })

function applyWhatIfScoreToInputs() {
  whatIfApplyNotice.value = ''
  const target = selectedWhatIfTarget.value
  if (!target) {
    whatIfApplyNotice.value = '请先选择要模拟的部分。'
    return
  }

  const ratio = Math.max(0, Math.min(1, (Number(whatIfScore.value) || 0) / 100))
  const defaultTotal = 100
  let updatedCount = 0

  const category = categories.value.find(cat => cat.id === target.categoryId)
  if (!category) {
    whatIfApplyNotice.value = '未找到该部分，无法自动填入。'
    return
  }

  if (target.kind === 'single' && category.type === 'single') {
    const total = Number(category.currentTotalPoints) > 0 ? Number(category.currentTotalPoints) : defaultTotal
    category.currentTotalPoints = total
    category.earnedPoints = Number((total * ratio).toFixed(2))
    category.released = true
    updatedCount += 1
  }

  if (target.kind === 'repeated' && category.type === 'repeated') {
    getVisibleItems(category).forEach((item) => {
      if (!item.released) {
        const total = Number(item.currentTotalPoints) > 0 ? Number(item.currentTotalPoints) : defaultTotal
        item.currentTotalPoints = total
        item.earnedPoints = Number((total * ratio).toFixed(2))
        item.released = true
        updatedCount += 1
      }
    })
  }

  if (target.kind === 'item' && category.type === 'repeated') {
    const item = getVisibleItems(category).find(current => current.id === target.itemId)
    if (item) {
      const total = Number(item.currentTotalPoints) > 0 ? Number(item.currentTotalPoints) : defaultTotal
      item.currentTotalPoints = total
      item.earnedPoints = Number((total * ratio).toFixed(2))
      item.released = true
      updatedCount += 1
    }
  }

  if (updatedCount > 0) {
    whatIfApplyNotice.value = `已自动填入 ${updatedCount} 项（按 ${whatIfScore.value.toFixed(0)}% 计算）。`
  } else {
    whatIfApplyNotice.value = '该部分暂无可自动填入项（可能已经出分）。'
  }
}

function getWhatIfContribution(category, target, ratio) {
  if (!target || target.categoryId !== category.id) {
    return getConfirmedContribution(category)
  }

  const weight = normalizeNumber(category.weight)
  if (weight <= 0) return 0

  if (target.kind === 'single' && category.type === 'single') {
    return weight * ratio
  }

  if (category.type !== 'repeated') {
    return getConfirmedContribution(category)
  }

  const items = getVisibleItems(category)
  if (!items.length) return 0

  if (target.kind === 'repeated') {
    return weight * ratio
  }

  if (target.kind === 'item') {
    if (category.distribution === 'equal') {
      let earned = 0
      let total = 0

      items.forEach((item) => {
        const totalPoints = normalizeNumber(item.currentTotalPoints)
        if (totalPoints <= 0) return

        let currentRatio = null
        if (item.id === target.itemId) {
          currentRatio = ratio
        } else if (item.released) {
          currentRatio = normalizeNumber(item.earnedPoints) / totalPoints
        }

        if (currentRatio !== null) {
          earned += currentRatio * totalPoints
          total += totalPoints
        }
      })

      if (total <= 0) return 0
      return (earned / total) * weight
    }

    const totalItemWeight = items.reduce((sum, item) => sum + (normalizeNumber(item.weight) || 0), 0)
    if (totalItemWeight <= 0) return 0

    let contribution = 0
    items.forEach((item) => {
      let currentRatio = null
      if (item.id === target.itemId) {
        currentRatio = ratio
      } else if (item.released && normalizeNumber(item.currentTotalPoints) > 0) {
        currentRatio = normalizeNumber(item.earnedPoints) / normalizeNumber(item.currentTotalPoints)
      }

      if (currentRatio !== null) {
        const itemProp = (normalizeNumber(item.weight) || 0) / totalItemWeight
        contribution += currentRatio * itemProp * weight
      }
    })

    return contribution
  }

  return getConfirmedContribution(category)
}

const whatIfProjectedGrade = computed(() => {
  const target = selectedWhatIfTarget.value
  if (!target) return confirmedGradeWithExtra.value

  const ratio = Math.max(0, Math.min(1, (Number(whatIfScore.value) || 0) / 100))
  const projectedWithoutExtra = categories.value.reduce((sum, category) => {
    return sum + getWhatIfContribution(category, target, ratio)
  }, 0)

  return projectedWithoutExtra + extraCreditContribution.value
})

const whatIfDelta = computed(() => {
  return whatIfProjectedGrade.value - confirmedGradeWithExtra.value
})

const healthCheckIssues = computed(() => {
  const issues = []

  if (totalWeight.value < 100) {
    issues.push(`总权重目前为 ${totalWeight.value.toFixed(2)}%，低于 100%。`)
  } else if (totalWeight.value > 100) {
    issues.push(`总权重目前为 ${totalWeight.value.toFixed(2)}%，超过 100%。`)
  }

  categories.value.forEach((category, index) => {
    const name = displayCategoryName(category, index)
    const weight = normalizeNumber(category.weight)

    if (weight <= 0) {
      issues.push(`${name} 的权重未填写或为 0。`)
    }

    if (category.type === 'single') {
      if (category.released) {
        if (!Number.isFinite(Number(category.currentTotalPoints)) || Number(category.currentTotalPoints) <= 0) {
          issues.push(`${name} 已标记为“有成绩”，但总分未正确填写。`)
        }
        if (!Number.isFinite(Number(category.earnedPoints))) {
          issues.push(`${name} 已标记为“有成绩”，但得分未填写。`)
        }
      }
    } else if (category.type === 'repeated') {
      const totalItems = Number(category.totalItems) || 0
      if (totalItems <= 0) {
        issues.push(`${name} 是多子项类型，但子项数量未设置。`)
      }

      if (category.distribution === 'custom') {
        const sumWeight = (category.items || []).slice(0, totalItems).reduce((sum, item) => sum + (Number(item.weight) || 0), 0)
        if (sumWeight <= 0) {
          issues.push(`${name} 使用了自定义子项权重，但子项权重总和为 0。`)
        }
      }

      ;(category.items || []).slice(0, totalItems).forEach((item, itemIndex) => {
        if (item.released) {
          if (!Number.isFinite(Number(item.currentTotalPoints)) || Number(item.currentTotalPoints) <= 0) {
            issues.push(`${name} 的第 ${itemIndex + 1} 项已出成绩，但总分未正确填写。`)
          }
          if (!Number.isFinite(Number(item.earnedPoints))) {
            issues.push(`${name} 的第 ${itemIndex + 1} 项已出成绩，但得分未填写。`)
          }
        }
      })
    }
  })

  return issues
})

const prioritySuggestions = computed(() => {
  return categories.value
    .map((category, index) => ({
      id: category.id,
      name: displayCategoryName(category, index),
      weight: normalizeNumber(category.weight),
      gainPerOnePercent: normalizeNumber(category.weight) / 100,
      unreleased: hasUnreleasedWork(category)
    }))
    .filter(item => item.unreleased && item.weight > 0)
    .sort((a, b) => b.gainPerOnePercent - a.gainPerOnePercent)
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

function gradeLabel(score) {
  const value = normalizeNumber(score)
  const scale = gradeScale.value
  const found = scale.find(item => value >= item.min)
  return found ? found.label : 'F'
}

const aMinusThreshold = computed(() => {
  if (gradeScalePreset.value !== 'custom') return 90
  const value = normalizeNumber(customAMinusThreshold.value)
  return Math.max(60, Math.min(99, value || 90))
})

const gradeScale = computed(() => {
  if (gradeScalePreset.value === 'china-90') {
    return [
      { label: 'A', min: 90 },
      { label: 'B', min: 80 },
      { label: 'C', min: 70 },
      { label: 'D', min: 60 },
      { label: 'F', min: 0 }
    ]
  }

  if (gradeScalePreset.value === 'gpa-4') {
    return [
      { label: 'A', min: 90 },
      { label: 'A-', min: 87 },
      { label: 'B+', min: 83 },
      { label: 'B', min: 80 },
      { label: 'B-', min: 77 },
      { label: 'C+', min: 73 },
      { label: 'C', min: 70 },
      { label: 'C-', min: 67 },
      { label: 'D', min: 60 },
      { label: 'F', min: 0 }
    ]
  }

  if (gradeScalePreset.value === 'custom') {
    const aMinus = aMinusThreshold.value
    const a = Math.min(100, aMinus + 3)
    return [
      { label: 'A', min: a },
      { label: 'A-', min: aMinus },
      { label: 'B+', min: aMinus - 3 },
      { label: 'B', min: aMinus - 7 },
      { label: 'B-', min: aMinus - 10 },
      { label: 'C+', min: aMinus - 13 },
      { label: 'C', min: aMinus - 17 },
      { label: 'C-', min: aMinus - 20 },
      { label: 'D', min: 60 },
      { label: 'F', min: 0 }
    ]
  }

  return [
    { label: 'A', min: 93 },
    { label: 'A-', min: 90 },
    { label: 'B+', min: 87 },
    { label: 'B', min: 83 },
    { label: 'B-', min: 80 },
    { label: 'C+', min: 77 },
    { label: 'C', min: 73 },
    { label: 'C-', min: 70 },
    { label: 'D', min: 60 },
    { label: 'F', min: 0 }
  ]
})

const gradeScaleText = computed(() => {
  if (gradeScalePreset.value === 'china-90') {
    return 'A(90+) / B(80+) / C(70+) / D(60+) / F(<60)'
  }

  if (gradeScalePreset.value === 'gpa-4') {
    return 'A(90+) / A-(87+) / B+(83+) / B(80+) / B-(77+) / C+(73+) / C(70+) / C-(67+) / D(60+) / F(<60)'
  }

  if (gradeScalePreset.value === 'custom') {
    const aMinus = aMinusThreshold.value
    const a = Math.min(100, aMinus + 3)
    return `A(${a.toFixed(1)}+) / A-(${aMinus.toFixed(1)}+) / B+(${(aMinus - 3).toFixed(1)}+) / B(${(aMinus - 7).toFixed(1)}+) / B-(${(aMinus - 10).toFixed(1)}+) / C+(${(aMinus - 13).toFixed(1)}+) / C(${(aMinus - 17).toFixed(1)}+) / C-(${(aMinus - 20).toFixed(1)}+) / D(60+) / F(<60)`
  }

  return 'A(93+) / A-(90+) / B+(87+) / B(83+) / B-(80+) / C+(77+) / C(73+) / C-(70+) / D(60+) / F(<60)'
})

const resultExplanation = computed(() => {
  const current = confirmedGradeWithExtra.value
  const best = bestPossibleGradeWithExtra.value
  const gap = Math.max(0, best - current)

  if (targetGradeA.value !== null && best < targetGradeA.value) {
    return `按当前配置，最好情况是 ${best.toFixed(2)}%，仍低于你的 A 目标 ${targetGradeA.value.toFixed(2)}%。建议降低目标或提高未出部分权重高的项目表现。`
  }

  if (gap <= 0.01) {
    return `你当前成绩约 ${current.toFixed(2)}%，可提升空间很小，说明大部分项目已出分或已经接近上限。`
  }

  return `你当前是 ${current.toFixed(2)}%，理论上最多到 ${best.toFixed(2)}%，还有 ${gap.toFixed(2)}% 的提升空间；重点提升未出成绩中权重更高的部分。`
})

function normalizeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function recordNumberInput(value) {
  const n = Number(value)
  if (Number.isFinite(n) && n !== 0) {
    numberHistory.value.add(String(n))

    const maxHistorySize = 300
    while (numberHistory.value.size > maxHistorySize) {
      const first = numberHistory.value.values().next().value
      numberHistory.value.delete(first)
    }
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

.save-status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.save-status-badge small {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.9;
}

.save-status-saving {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.save-status-saved {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.save-status-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
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
  grid-template-columns: 2fr 1.2fr 1fr 1.2fr auto;
  gap: 14px;
  margin-bottom: 18px;
  align-items: flex-start;
  background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
  padding: 18px;
  border-radius: 14px;
  border: 2px solid #cffafe;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(3, 105, 161, 0.05);
}

.input-hint {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  margin-bottom: 8px;
}

@media (max-width: 900px) {
  .container {
    margin: 20px auto;
    padding: 12px;
  }

  .box {
    padding: 16px;
  }

  .category {
    grid-template-columns: 1fr;
  }

  .category > * {
    width: 100%;
  }

  .repeated-item {
    padding: 10px;
  }

  input, select {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 500px) {
  h1 {
    font-size: 1.9rem;
  }

  h2 {
    font-size: 1.2rem;
  }

  .target-box {
    padding: 18px;
  }
}

.repeated-item {
  margin-top: 10px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #ffffff;
}

.repeated-item-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.item-name-input {
  flex: 1;
  min-width: 0;
}

.repeated-rule-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

input,
select {
  min-width: 0;
}

input {
  width: 100%;
  min-width: 0;
  padding: 13px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 12px;
  font-size: 14px;
  color: #1e3a8a;
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fff0d7;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

select {
  width: 100%;
  min-width: 0;
  padding: 13px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 12px;
  font-size: 14px;
  color: #1e3a8a;
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fff0d7;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
  cursor: pointer;
}

input:hover {
  border-color: #cffafe;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02), 0 2px 8px rgba(3, 105, 161, 0.06);
}

select:hover {
  border-color: #cffafe;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02), 0 2px 8px rgba(3, 105, 161, 0.06);
}

input:focus {
  outline: none;
  border-color: #0369a1;
  box-shadow: 0 0 0 4px rgba(3, 105, 161, 0.1), inset 0 2px 4px rgba(3, 105, 161, 0.04);
}

select:focus {
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