<script setup lang="ts">
import { computed } from 'vue'
import { isAddress } from 'ethers'
import { Plus, ArrowUpRight } from '@lucide/vue'

const props = withDefaults(defineProps<{
  recipient: string
  taxBps: number
  buybackEnabled: boolean
  connectedAccount?: string
  maxTaxBps?: number
  creatorShareBps?: number
  buybackShareBps?: number
  disabled?: boolean
}>(), { maxTaxBps: 1000, creatorShareBps: 7000, buybackShareBps: 5000, connectedAccount: '', disabled: false })
const emit = defineEmits<{
  'update:recipient': [value: string]
  'update:taxBps': [value: number]
  'update:buybackEnabled': [value: boolean]
}>()
const recipientError = computed(() => props.recipient.trim() && !isAddress(props.recipient.trim()) ? 'Enter a valid wallet address, or leave this blank to use your connected wallet.' : '')
function changeTax(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:taxBps', /^\d+(\.\d{0,2})?$/.test(value) ? Math.round(Number(value) * 100) : -1)
}
const taxError = computed(() => props.taxBps < 0 || props.taxBps > props.maxTaxBps ? `Choose a creator tax between 0% and ${props.maxTaxBps / 100}%, with at most two decimal places.` : '')
</script>

<template>
  <details class="ab-settings">
    <summary>Creator settings <span>Fees &amp; long-term ownership</span><Plus :size="15"/></summary>
    <div class="ab-settings-body">
      <label>Fee recipient<input :value="recipient" :disabled="disabled" spellcheck="false" autocomplete="off" :placeholder="connectedAccount || 'Your connected wallet by default'" @input="emit('update:recipient', ($event.target as HTMLInputElement).value)"/></label>
      <p>Your creator fees go to this wallet. Leaving it blank uses the wallet that launches the sound.</p>
      <p v-if="recipientError" class="ab-settings-error" role="status">{{ recipientError }}</p>
      <label class="ab-tax-field">Additional creator tax <span><input :value="taxBps < 0 ? '' : taxBps / 100" :disabled="disabled" type="number" min="0" :max="maxTaxBps / 100" step="0.01" inputmode="decimal" @input="changeTax"/><strong>%</strong></span></label>
      <p>Added to the base trading fee and paid entirely to your fee recipient. Buyers and sellers can review the rate before trading.</p>
      <p v-if="taxError" class="ab-settings-error" role="status">{{ taxError }}</p>
      <label class="ab-buyback"><input :checked="buybackEnabled" :disabled="disabled" type="checkbox" @change="emit('update:buybackEnabled', ($event.target as HTMLInputElement).checked)"/><span><strong>Enable sound buyback &amp; lock <ArrowUpRight :size="13"/></strong><small>Use {{buybackShareBps / 100}}% of your base-fee allocation to buy this sound token. Bought tokens vest linearly over five years, split {{creatorShareBps / 100}}% to the creator fee recipient and {{100 - creatorShareBps / 100}}% to the protocol. This reduces immediate creator cash; it does not guarantee returns.</small></span></label>
    </div>
  </details>
</template>

