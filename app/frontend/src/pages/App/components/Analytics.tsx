import { useEffect, useMemo, useRef, useState } from 'react';

import { ethersProvider, publicClient } from '../../../config/walletconfig';
import { useComposeContext } from '../../../contexts/ComposeProvider';
import { Bar, Chart, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import Select, { Value } from './Select';
import { ChartData } from 'chart.js/auto';
import DropdownInput from './DropdownInput';
import moment from 'moment';
import { ethers, formatEther } from 'ethers';
import useEffectOnce from '../../../hooks/useEffectOnce';
import { DtType } from '../../../constants/types';
import { dtTypes, periods } from '../../../constants/variables';
import { useMainContext } from '../../../contexts/MainContext';

const Explore = () => {
  const tran = useRef();
  const { address } = useComposeContext();

  const [balData, setBalData] = useState<{ [key: string]: { x: Date; y: string }[] }>({
    daily: [],
    weekly: [],
    monthly: [],
  });

  const [dataType, setDataType] = useState<DtType>('balance');
  const [threshold, setThreshold] = useState(2);

  const { period, setPeriod, totalFlowData } = useMainContext();

  const options = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        title: {
          display: true,
          text: `${dataType} History`.toUpperCase(),
        },
        chartAreaBorder: {
          borderColor: '#33373E',
          borderWidth: 2,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          grid: {
            display: false,
          },
        },
      },
    }),
    [dataType]
  );

  useEffectOnce(() => {
    if (!address) return;
    const getBalances = async () => {
      const currentTime = Date.now();
      const historicDate = {
        daily: {
          duration: 24 * 60 * 60 * 1000,
          range: 14,
        },
        weekly: {
          duration: 7 * 24 * 60 * 60 * 1000,
          range: 12,
        },
        monthly: {
          duration: 30 * 24 * 60 * 60 * 1000,
          range: 12,
        },
      };

      let blockNum = await publicClient.getBlockNumber({
        cacheTime: 1000000,
      });
      let currentBlockNum = Number(blockNum);
      let weekBlock = currentBlockNum;
      let monthBlock = currentBlockNum;

      const blockDuration = Math.floor(historicDate.daily.duration / 13200);

      const blockNums: { [key: string]: { x: Date; y: number }[] } = {
        daily: [],
        weekly: [],
        monthly: [],
      };

      for (let i = 0; i < historicDate.daily.range; i++) {
        blockNums.daily.push({
          x: new Date(currentTime - historicDate.daily.duration * i),
          y: currentBlockNum,
        });
        if (weekBlock === currentBlockNum) {
          blockNums.weekly.push({
            x: new Date(currentTime - historicDate.weekly.duration * i),
            y: currentBlockNum,
          });
          weekBlock -= blockDuration * 7;
        }

        if (monthBlock === currentBlockNum) {
          blockNums.monthly.push({
            x: new Date(currentTime - historicDate.monthly.duration * i),
            y: currentBlockNum,
          });
          monthBlock -= blockDuration * 30;
        }

        currentBlockNum -= blockDuration;
      }

      console.log(blockNums.length);

      const balances = await Promise.all(
        Object.keys(blockNums).map((key) =>
          Promise.all(
            blockNums[key].map((blockNum) =>
              publicClient.getBalance({ address, blockNumber: BigInt(blockNum.y) })
            )
          )
        )
      );

      const _data = {
        daily: blockNums.daily
          .map((d, i) => ({
            x: d.x,
            y: formatEther(balances[0][i]),
          }))
          .reverse(),
        weekly: blockNums.weekly
          .map((d, i) => ({
            x: d.x,
            y: formatEther(balances[1][i]),
          }))
          .reverse(),
        monthly: blockNums.monthly
          .map((d, i) => ({
            x: d.x,
            y: formatEther(balances[2][i]),
          }))
          .reverse(),
      };

      return _data;
    };

    getBalances()
      .then((data) => setBalData(data))
      .catch((error) => console.error({ a: 456, error }));
  }, [address]);

  const periodicBalData = useMemo(
    () =>
      period === 'daily' ? balData.daily : period === 'weekly' ? balData.weekly : balData.monthly,
    [balData, period]
  );

  const data = useMemo(() => {
    if (dataType === 'balance') {
      return periodicBalData;
    }

    if (dataType === 'inflow') return totalFlowData.cumulativeInflow;

    return totalFlowData.cumulativeOutflow;
  }, [dataType, totalFlowData, periodicBalData]);

  const chartData = useMemo<ChartData<'line'>>(
    () => ({
      labels: data?.map((d) => {
        if (period === 'daily') {
          return moment(d.x).format('MMM D');
        } else if (period === 'weekly') {
          return moment(d.x).format('MMM Do');
        } else {
          return moment(d.x).format('MMM');
        }
      }),
      datasets: [
        {
          label: 'Balance',
          data: data?.map((d) => Number(d.y)) ?? [0, 0, 0, 0, 0, 0],
          borderWidth: 2,
          fill: true,
          borderColor: '#402E8D',
          pointStyle: false,
          tension: 0.4,
          backgroundColor: '#402E8D34',
        },
        {
          label: 'Budget Threshold',
          data: data?.map((d) => threshold) ?? [0, 0, 0, 0, 0, 0],
          pointStyle: false,
          borderWidth: 2,
          borderDash: [5, 5],
          borderColor: dataType === 'outflow' ? 'red' : '#0000',
        },
      ],
    }),
    [data, period, threshold, dataType]
  );

  useEffect(() => {
    console.log(totalFlowData);
  }, [totalFlowData, period]);

  return (
    <div className="col-span-full">
      <div className="mt-5">
        <div className="flex justify-between max-sm:flex-col">
          <div className="flex gap-4 items-center max-sm:justify-center">
            <Select inputs={dtTypes} onSelect={(str) => setDataType(str as DtType)} />
            <DropdownInput value={threshold} onUpdate={setThreshold} />
            <Select inputs={periods} onSelect={(str) => setPeriod(str as Value)} />
          </div>
        </div>

        <Line options={options} data={chartData} className="w-full mt-6" />
      </div>
    </div>
  );
};

export default Explore;