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
import useHistory from '../../../hooks/useHistory';
import useEffectOnce from '../../../hooks/useEffectOnce';
import { DtType } from '../../../constants/types';
import { dtTypes, periods } from '../../../constants/variables';
import { useMainContext } from '../../../contexts/MainContext';

const options = {
  responsive: true,

  plugins: {
    legend: {
      position: 'bottom' as const,
    },
    title: {
      display: true,
      text: 'Balance History',
    },
  },
};

const Explore = () => {
  const tran = useRef();
  const { address } = useComposeContext();

  const [balData, setBalData] = useState<{ x: Date; y: string }[]>();

  const [dataType, setDataType] = useState<DtType>('balance');
  const [threshold, setThreshold] = useState(2);

  const { period, setPeriod, totalFlowData } = useMainContext();

  const data = useMemo(() => {
    if (!balData) {
      return [];
    }

    if (dataType === 'balance') {
      return balData;
    }

    if (dataType === 'inflow') {
      return totalFlowData.inflows;
    }

    return totalFlowData.outflows;
  }, [totalFlowData, balData, dataType]);

  const getBalances = async () => {
    const _data = [];

    const currentTime = Date.now();
    const historicDate =
      period === 'daily'
        ? {
            duration: 24 * 60 * 60 * 1000,
            range: 14,
          }
        : period === 'weekly'
        ? {
            duration: 7 * 24 * 60 * 60 * 1000,
            range: 12,
          }
        : {
            duration: 30 * 24 * 60 * 60 * 1000,
            range: 12,
          };

    let blockNum = await publicClient.getBlockNumber({
      cacheTime: 100000,
    });
    let currentBlockNum = Number(blockNum);

    const blockDuration = Math.floor(historicDate.duration / 13200);

    for (let i = 0; i < historicDate.range; i++) {
      const balance = await publicClient.getBalance({
        address: address!,
        blockNumber: BigInt(currentBlockNum),
      });

      _data.push({
        x: new Date(currentTime - historicDate.duration * i),
        y: formatEther(balance),
      });

      currentBlockNum -= blockDuration;
    }

    return _data.reverse();
  };

  useEffectOnce(() => {
    getBalances()
      .then((data) => setBalData(data))
      .catch((error) => console.error({ a: 456, error }));
  }, [period, address]);

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
          borderWidth: 1,
          fill: true,
          borderColor: 'rgba(167, 184, 159, 1)',
          pointStyle: false,
          tension: 0.4,
          backgroundColor: 'rgb(167, 184, 159, 0.04)',
        },
        {
          label: 'Budget Threshold',
          data: data?.map((d) => threshold) ?? [0, 0, 0, 0, 0, 0],
          pointStyle: false,
          borderWidth: 0.5,
          borderDash: [5, 5],
          borderColor: 'red',
        },
      ],
    }),
    [data, period, threshold]
  );

  return (
    <div className="col-span-4">
      <div className="">
        <div className="flex justify-between">
          <p className="text-2xl font-bold">Explore</p>
          <div className="flex gap-4 items-center">
            <Select inputs={dtTypes} onSelect={(str) => setDataType(str as DtType)} />
            <DropdownInput value={threshold} onUpdate={setThreshold} />
            <Select inputs={periods} onSelect={(str) => setPeriod(str as Value)} />
          </div>
        </div>

        <Line options={options} data={chartData} className="w-full" />
      </div>
    </div>
  );
};

export default Explore;