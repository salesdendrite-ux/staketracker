import { useState } from 'react';
import { Radar, Loader2 } from 'lucide-react';
import { scrapeAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ScrapeButton({ companyId, onComplete }) {
  const [loading, setLoading] = useState(false);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const res = await scrapeAPI.trigger(companyId);
      const jobId = res.data.id;

      toast.loading('Scraping in progress…', { id: 'scrape' });

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const jobRes = await scrapeAPI.jobDetail(jobId);
          const job = jobRes.data;

          if (job.status === 'completed') {
            clearInterval(poll);
            setLoading(false);
            toast.success(
              `Found ${job.stakeholders_found} people, ${job.changes_detected} changes`,
              { id: 'scrape' }
            );
            onComplete?.();
          } else if (job.status === 'failed') {
            clearInterval(poll);
            setLoading(false);
            toast.error(`Scrape failed: ${job.error_message || 'Unknown error'}`, { id: 'scrape' });
          }
        } catch {
          // Keep polling
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(poll);
        setLoading(false);
        toast.dismiss('scrape');
      }, 300000);
    } catch (err) {
      setLoading(false);
      toast.error(err.response?.data?.error || 'Failed to start scrape');
    }
  };

  return (
    <button onClick={handleScrape} disabled={loading} className="btn-primary">
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Scraping…
        </>
      ) : (
        <>
          <Radar className="w-4 h-4" />
          Scrape Now
        </>
      )}
    </button>
  );
}
